<?php

namespace App\Exports;

use App\Models\AdmModels\AdmPrivileges;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\Exportable;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use App\Helpers\CommonHelpers;
use App\Models\AdmUser;
use DB;

class Export implements FromQuery, WithHeadings, WithMapping
{
    use Exportable;
    protected $filter_column;
    protected $table;
    protected $columns;
    protected $limit;
    public function __construct($table, $columns, $fields, $limit){
        $this->filter_column  = $fields;
        $this->table  = $table;
        $this->columns  = $columns;
        $this->limit  = $limit;
    }

    public function headings(): array {
        $headings = [...$this->columns];
        return $headings;
    }

    public function map($row): array {
        return array_values($row->toArray());
    }

    public function query() {
        if($this->table === 'adm_users'){
            $rows = AdmUser::leftJoin('adm_privileges','adm_users.id_adm_privileges','adm_privileges.id')->with('role')
            ->select('adm_users.name','adm_users.email','adm_privileges.name AS privilege','adm_users.created_at','adm_users.updated_at')
            ->orderBy('adm_users.id', 'ASC');
        }else{
            $rows = AdmPrivileges::select($this->columns)->orderBy('id', 'ASC');
        }
    
        if ($this->filter_column) {
            $filter_column = $this->filter_column;

            $rows->where(function($w) use ($filter_column) {
                foreach($filter_column as $key=>$fc) {
                    if(!in_array($key,['privilege'])){
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
                                    if($key && $value) $w->whereIn($key,$value);
                                }
                            break;
                        }
                    }else{
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
                                if($key && $type && $value)
                                $w->orWhereHas('role', function ($w) use ($type,$value) {
                                    $w->where('name', $type, $value);
                                });
                            break;
                            case 'like':
                            case 'not like':
                                $value = '%'.$value.'%';
                                if($key && $type && $value) 
                                $w->orWhereHas('role', function ($w) use ($type,$value) {
                                    $w->where('name', $type, $value);
                                });
                            break;
                            case 'in':
                            case 'not in':
                                if($value) {
                                    $value = explode(',',$value);
                                    if($key && $value)
                                    $w->orWhereHas('role', function ($w) use ($value) {
                                        $w->whereIn('name', $value);
                                    });
                                }
                            break;
                        }
                    }
                }
            });

            foreach($filter_column as $key=>$fc) {
                $value = @$fc['value'];
                $type  = @$fc['type'];
                $sorting = @$fc['sorting'];

                if($sorting!='') {
                    if($key) {
                        $rows->orderby($key,$sorting);
                        $filter_is_orderby = true;
                    }
                }

                if ($type=='between') {
                    if($key && $value) $rows->whereBetween($key,$value);
                }

                else {
                    continue;
                }
            }
        }

        if($this->limit){
            return $rows->limit($this->limit);
        }

        return $rows;
    }
}
