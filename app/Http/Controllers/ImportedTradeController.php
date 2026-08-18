<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessImportedTradesBatch;
use App\Models\ImportedTrade;
use App\Models\ImportedTradeBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

/**
 * Broker/exchange CSV trade import.
 *
 * Imported trades are a completely separate, real-trade dataset. They are
 * never joined into the simulated MarketBacktest* tables/services.
 */
class ImportedTradeController extends Controller
{
    private const MAX_ROWS = 20000;

    /**
     * Store the uploaded CSV privately and return its header row plus a
     * short preview so the trader can map columns before committing.
     */
    public function preview(Request $request)
    {
        $validated = $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:10240'],
            'broker' => ['nullable', 'string', 'max:64'],
        ]);

        $userId = $request->user()->id;
        $file = $request->file('file');

        $path = $file->store("imported-trades/{$userId}", 'local');

        $sheets = Excel::toArray(null, $file);
        $rows = $sheets[0] ?? [];
        $headers = collect($rows[0] ?? [])
            ->map(fn ($value) => is_string($value) ? trim($value) : $value)
            ->values()
            ->all();
        $previewRows = array_slice($rows, 1, 20);

        $batch = ImportedTradeBatch::create([
            'adm_user_id' => $userId,
            'broker' => $this->nullableTrim($validated['broker'] ?? null),
            'original_filename' => $file->getClientOriginalName(),
            'file_path' => $path,
            'status' => 'mapping',
        ]);

        return response()->json([
            'success' => true,
            'batchId' => $batch->id,
            'headers' => $headers,
            'previewRows' => $previewRows,
        ]);
    }

    /**
     * Save the column mapping + source timezone and dispatch the async
     * import job. The batch stays in the 'mapping' state until this call.
     */
    public function commit(Request $request, ImportedTradeBatch $batch)
    {
        abort_unless($batch->adm_user_id === $request->user()->id, 404);

        $validated = $request->validate([
            'column_mapping' => ['required', 'array'],
            'column_mapping.symbol' => ['required', 'string'],
            'column_mapping.side' => ['required', 'string'],
            'column_mapping.quantity' => ['required', 'string'],
            'column_mapping.entry_price' => ['required', 'string'],
            'column_mapping.exit_price' => ['nullable', 'string'],
            'column_mapping.fee' => ['nullable', 'string'],
            'column_mapping.realized_pnl' => ['nullable', 'string'],
            'column_mapping.opened_at_time' => ['nullable', 'string'],
            'column_mapping.closed_at_time' => ['nullable', 'string'],
            'source_timezone' => ['required', 'timezone'],
        ]);

        if (!$batch->file_path || !Storage::disk('local')->exists($batch->file_path)) {
            abort(422, 'The uploaded file could not be found. Please upload it again.');
        }

        if ($this->countDataRows($batch->file_path) > self::MAX_ROWS) {
            return response()->json([
                'success' => false,
                'message' => 'This file has more than '.number_format(self::MAX_ROWS).' rows. Please split it into smaller files.',
            ], 422);
        }

        $batch->update([
            'column_mapping' => $validated['column_mapping'],
            'source_timezone' => $validated['source_timezone'],
            'status' => 'pending',
        ]);

        ProcessImportedTradesBatch::dispatch($batch->id);

        return response()->json([
            'success' => true,
            'batch' => $this->serializeBatch($batch->fresh()),
        ]);
    }

    /**
     * The authenticated trader's own import batches, newest first.
     */
    public function batches(Request $request)
    {
        $batches = ImportedTradeBatch::query()
            ->where('adm_user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json([
            'success' => true,
            'batches' => $batches->map(fn (ImportedTradeBatch $batch) => $this->serializeBatch($batch))->values(),
        ]);
    }

    /**
     * Delete an owned batch, its stored file (if still present), and every
     * imported_trades row that belongs to it (cascades via foreign key).
     */
    public function destroyBatch(Request $request, ImportedTradeBatch $batch)
    {
        abort_unless($batch->adm_user_id === $request->user()->id, 404);

        if ($batch->file_path && Storage::disk('local')->exists($batch->file_path)) {
            Storage::disk('local')->delete($batch->file_path);
        }

        $batch->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Paginated, read-only list of the authenticated trader's imported
     * trades, optionally filtered to a single batch.
     */
    public function items(Request $request)
    {
        $validated = $request->validate([
            'batch_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = ImportedTrade::query()->where('adm_user_id', $request->user()->id);

        if (!empty($validated['batch_id'])) {
            $query->where('imported_trade_batch_id', $validated['batch_id']);
        }

        $trades = $query
            ->orderByDesc('closed_at_time')
            ->orderByDesc('id')
            ->paginate(50)
            ->withQueryString();

        return response()->json([
            'success' => true,
            'trades' => $trades->getCollection()->map(fn (ImportedTrade $trade) => $this->serializeTrade($trade))->values(),
            'pagination' => [
                'currentPage' => $trades->currentPage(),
                'lastPage' => $trades->lastPage(),
                'total' => $trades->total(),
                'perPage' => $trades->perPage(),
            ],
        ]);
    }

    private function countDataRows(string $path): int
    {
        $rows = Excel::toArray(null, $path, 'local')[0] ?? [];

        return max(0, count($rows) - 1);
    }

    private function serializeBatch(ImportedTradeBatch $batch): array
    {
        return [
            'id' => $batch->id,
            'broker' => $batch->broker,
            'originalFilename' => $batch->original_filename,
            'columnMapping' => $batch->column_mapping,
            'sourceTimezone' => $batch->source_timezone,
            'status' => $batch->status,
            'totalRows' => $batch->total_rows,
            'importedRows' => $batch->imported_rows,
            'duplicateRows' => $batch->duplicate_rows,
            'errorRows' => $batch->error_rows,
            'error' => $batch->error,
            'rowErrors' => $batch->row_errors,
            'createdAt' => optional($batch->created_at)->toIso8601String(),
            'updatedAt' => optional($batch->updated_at)->toIso8601String(),
        ];
    }

    private function serializeTrade(ImportedTrade $trade): array
    {
        return [
            'id' => $trade->id,
            'batchId' => $trade->imported_trade_batch_id,
            'broker' => $trade->broker,
            'symbol' => $trade->symbol,
            'side' => $trade->side,
            'quantity' => (float) $trade->quantity,
            'entryPrice' => (float) $trade->entry_price,
            'exitPrice' => $trade->exit_price !== null ? (float) $trade->exit_price : null,
            'fee' => (float) $trade->fee,
            'realizedPnl' => $trade->realized_pnl !== null ? (float) $trade->realized_pnl : null,
            'openedAtTime' => $trade->opened_at_time,
            'closedAtTime' => $trade->closed_at_time,
            'notes' => $trade->notes,
        ];
    }

    private function nullableTrim(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim($value);

        return $trimmed === '' ? null : $trimmed;
    }
}
