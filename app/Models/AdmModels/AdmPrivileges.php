<?php

namespace App\Models\AdmModels;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdmPrivileges extends Model
{
    use HasFactory;

    protected $guarded = [];

    protected $filterable = [
        'name',
        'is_superadmin',
        'theme_color',
        'created_at',
        'updated_at'
    ];

    public function scopeGetData($query){
        return $query;
    }

    public function scopeSearchAndFilter($query, $request){
        $filter_column = $request['filter_column'] ?? [];
        if ($request['search']) {
            $search = $request['search'];
            $query->where(function ($query) use ($search) {
                foreach ($this->filterable as $field) {
                    $query->orWhere($field, 'LIKE', "%$search%");
                }
            });
        } 
        else {
            //filter function
            $query->where(function($w) use ($filter_column) {
                if(is_array($filter_column)){
                    foreach((array)$filter_column as $key=>$fc) {

                        $value = @$fc['value'];
                        $type  = @$fc['type'];

                        if($type == 'empty') {
                            $w->whereNull($key)->orWhere($key,'');
                            continue;
                        }

                        if($value=='' || $type=='') continue;

                        if($type == 'between') continue;

                        switch($type) {
                            default:
                                if($key && $type && $value) $w->where($key,$type,$value);
                            break;
                            case 'like':
                            case 'not like':
                                $value = '%'.$value.'%';
                                if($key && $type && $value) $w->where($key,$type,$value);
                            break;
                            case 'in':
                            case 'not in':
                                if($value) {
                                    $value = explode(',',$value);
                                    if($key && $value) $w->whereIn($key,$value);
                                }
                            break;
                        }
                    }
                }
            });
            if(is_array($filter_column)){
                foreach((array)$filter_column as $key=>$fc) {
                    $value = @$fc['value'];
                    $type  = @$fc['type'];
                    $sorting = @$fc['sort'];

                    if($sorting!='') {
                        if($key) {
                            $query->orderby($key,$sorting);
                            $filter_is_orderby = true;
                        }
                    }

                    if ($type=='between') {
                        if($key && $value) $query->whereBetween($key,$value);
                    }

                    else {
                        continue;
                    }
                }
            }
        }

        return $query;
    }

    public function scopeFilterData($query){
        return $query->select(
            'name AS name',
            'is_superadmin AS is_superadmin',
            'theme_color AS theme_color',
            'created_at AS created_at',
            'updated_at AS updated_at'
        );
    }
}
