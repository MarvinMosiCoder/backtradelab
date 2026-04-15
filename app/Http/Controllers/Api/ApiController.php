<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\AdmModels\ApiConfiguration;
use App\Models\AdmModels\ApiKeys;
use App\Models\AdmModels\ApiRateLimits;
use App\Models\AdmModels\ApiLogs;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Exception;
use Carbon\Carbon;
use Illuminate\Support\Facades\Crypt;

class ApiController extends Controller
{
    public function handleRequest(Request $request, $endpoint)
    {
        try {
            // Check if API endpoint exists
            $api = ApiConfiguration::where('endpoint', $endpoint)->firstOrFail();

            if (!$api->status) {
                return response()->json(['error' => 'API Inactive'], 403);
            }

            // Validate API Key
            if (!$this->isValidApiKey($request)) {
                return response()->json(['error' => 'Unauthorized API Key'], 401);
            }

            // Check rate limiting
            if (!$this->isRateLimited($request, $api->id, $api->rate_limit)) {
                return response()->json(['error' => 'Too Many Requests'], 429);
            }

            // Process request
            $method = strtoupper($request->method());
            $table = $api->table_name;
            $fields = is_array($api->fields) ? $api->fields : json_decode($api->fields, true) ?? [];
            $rules = is_array($api->rules) ? $api->rules : json_decode($api->rules, true) ?? [];

            if (!is_array($fields) || !is_array($rules)) {
                return response()->json(['error' => 'Invalid API configuration'], 500);
            }

            if ($api->method !== 'ALL' && $api->method !== $method) {
                return response()->json(['error' => 'Method Not Allowed'], 405);
            }

            if ($method === 'GET') {
                try {
                    // Ensure fields are prefixed with the main table name to avoid ambiguity
                    $fields = array_map(function ($field) use ($table) {
                        return "$table.$field";
                    }, $fields);

                    $query = DB::table($table)->select($fields);

                    // Apply relationships dynamically
                    $relationships = is_string($api->relations) ? json_decode($api->relations, true) : $api->relations;

                    if (!empty($relationships) && is_array($relationships)) {
                        foreach ($relationships as $alias => $relation) {
                            if (isset($relation['table'], $relation['column'], $relation['column_get'])) {
                                $joinAlias = "{$relation['table']}_{$alias}";
                                $query->leftJoin("{$relation['table']} as {$joinAlias}", "{$joinAlias}.{$relation['column']}", '=', "{$table}.{$alias}")
                                    ->addSelect("{$joinAlias}.{$relation['column_get']} as {$alias}_{$relation['column_get']}");
                            }
                        }
                    }

                    // WHERE condition
                    if (!empty($api->sql_parameter)) {
                        $query->whereRaw($api->sql_parameter);
                    }

                    // Implement pagination
                    $limit = min($request->input('limit', 50), 100);
                    $offset = max($request->input('offset', 0), 0);
                    $query->limit($limit)->offset($offset);

                    $initial_response = $query->get();
                    $response = Crypt::encryptString($initial_response);

                    // Mask sensitive data before logging
                    $log_data = collect($initial_response)->map(function ($item) {
                        unset($item->password, $item->token);
                        return $item;
                    });

                    // Log API requesT
                    if ($api->enable_logging) {
                        $this->logRequest($request, $api->id, $log_data);
                    }

                    return response()->json([
                        'success' => true,
                        'data' => $initial_response,
                        'message' => $api->name . ' retrieved successfully',
                    ], 200);
                } catch (\Exception $e) {
                    return response()->json(['success' => false, 'error' => $e->getMessage()], 500);
                }
            }

            // Handle both Create (POST) and Update (POST with ID)
            elseif ($method === 'POST') {
                $id = $request->route('id');

                // Validation rules apply to both insert and update
                $validator = Validator::make($request->all(), $rules);
                if ($validator->fails()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Validation failed',
                        'errors' => $validator->errors()
                    ], 422);
                }

                // Prepare data from request
                $data = $request->only($fields);

                // If updating (ID exists)
                if ($id) {
                    if (empty($data)) {
                        return response()->json([
                            'success' => false,
                            'message' => 'No fields provided for update.'
                        ], 400);
                    }

                    // Perform update
                    $affectedRows = DB::table($table)
                        ->where('id', $id)
                        ->update($data);

                    if ($affectedRows) {
                        // Log API request
                        if ($api->enable_logging) {
                            $this->logRequest($request, $api->id, $affectedRows);
                        }

                        return response()->json([
                            'success' => true,
                            'message' => 'Data updated successfully'
                        ], 200);
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'No records updated. Either ID is incorrect or data remains unchanged.'
                        ], 400);
                    }
                }

                // If inserting ID does not exist
                else {
                    $newId = DB::table($table)->insertGetId($data);

                    // Log API request
                    if ($api->enable_logging) {
                        $this->logRequest($request, $api->id, $newId);
                    }

                    return response()->json([
                        'success' => true,
                        'message' => 'Data created successfully',
                        'id' => $newId
                    ], 201);
                }
            }

            // DELETE Method
            elseif ($method === 'DELETE') {
                $id = $request->route('id');
                if (!$id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'ID is required for deleting data.'
                    ], 400);
                }

                $deleted = DB::table($table)->where('id', $id)->delete();

                if ($deleted) {
                    // Log API request
                    if ($api->enable_logging) {
                        $this->logRequest($request, $api->id, $deleted);
                    }

                    return response()->json([
                        'success' => true,
                        'message' => 'Data deleted successfully'
                    ], 200);
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'No record found with the given ID.'
                    ], 404);
                }
            }

            // Invalid Method
            else {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid Request'
                ], 400);
            }

            return response()->json($response);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'API Endpoint Not Found'], 404);
        } catch (QueryException $e) {
            return response()->json(['error' => 'Database Error: ' . $e->getMessage()], 500);
        } catch (Exception $e) {
            return response()->json(['error' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    // Check if API Key is valid
    private function isValidApiKey(Request $request)
    {
        $apiKey = $request->header('X-API-KEY');
        return ApiKeys::where('secret_key', $apiKey)->where('status', 1)->exists();
    }

    // Rate Limiting
    private function isRateLimited(Request $request, $apiId, $rateLimit)
    {
        $ip = $request->ip();
        $userId = $request->user()->id ?? null;

        $rate = ApiRateLimits::where('api_id', $apiId)
            ->where(function ($query) use ($userId, $ip) {
                $query->where('user_id', $userId)->orWhere('ip_address', $ip);
            })
            ->first();

        if (!$rate) {
            ApiRateLimits::create([
                'api_id' => $apiId,
                'user_id' => $userId,
                'ip_address' => $ip,
                'requests_made' => 1,
                'reset_time' => Carbon::now()->addMinute(),
            ]);
            return true;
        }

        if ($rate->requests_made >= $rateLimit) {
            return false;
        }

        $rate->increment('requests_made');
        return true;
    }

    // Log API Requests
    private function logRequest(Request $request, $apiId, $response)
    {
        ApiLogs::create([
            'api_id' => $apiId,
            'user_id' => $request->user()->id ?? null,
            'method' => $request->method(),
            'ip_address' => $request->ip(),
            'request_data' => json_encode($request->all()),
            'response_data' => json_encode($response),
            'status_code' => 200,
            'headers' => json_encode($request->headers->all()),
        ]);
    }
}
