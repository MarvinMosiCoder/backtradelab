<?php

namespace App\Jobs;

use App\Models\AdmModels\AdmNotifications;
use App\Models\ImportedTrade;
use App\Models\ImportedTradeBatch;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use RuntimeException;
use Throwable;

class ProcessImportedTradesBatch implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const CHUNK_SIZE = 500;
    private const MAX_ROW_ERRORS = 50;

    public function __construct(private int $batchId)
    {
    }

    public function handle(): void
    {
        $batch = ImportedTradeBatch::find($this->batchId);

        if (!$batch) {
            return;
        }

        $batch->update(['status' => 'processing']);

        try {
            $result = $this->import($batch);

            if ($batch->file_path) {
                Storage::disk('local')->delete($batch->file_path);
            }

            $batch->update([
                'status' => 'ready',
                'total_rows' => $result['totalRows'],
                'imported_rows' => $result['importedRows'],
                'duplicate_rows' => $result['duplicateRows'],
                'error_rows' => $result['errorRows'],
                'row_errors' => $result['rowErrors'],
                'error' => null,
            ]);

            AdmNotifications::query()->firstOrCreate(
                ['source_type' => 'imported_trade_batch', 'source_id' => $batch->id],
                [
                    'adm_user_id' => $batch->adm_user_id,
                    'type' => 'import',
                    'content' => "Your trade import ({$batch->original_filename}) finished: {$result['importedRows']} imported, {$result['duplicateRows']} duplicates, {$result['errorRows']} errors.",
                    'url' => '/trade-report',
                    'is_read' => false,
                ]
            );
        } catch (Throwable $e) {
            // Keep the file on disk for debugging when the job fails.
            $batch->update(['status' => 'failed', 'error' => $e->getMessage()]);

            AdmNotifications::query()->firstOrCreate(
                ['source_type' => 'imported_trade_batch', 'source_id' => $batch->id],
                [
                    'adm_user_id' => $batch->adm_user_id,
                    'type' => 'import',
                    'content' => "Your trade import ({$batch->original_filename}) failed. Please check the file and try again.",
                    'url' => '/trade-report',
                    'is_read' => false,
                ]
            );

            throw $e;
        }
    }

    /**
     * @return array{totalRows:int,importedRows:int,duplicateRows:int,errorRows:int,rowErrors:array}
     */
    private function import(ImportedTradeBatch $batch): array
    {
        $mapping = $batch->column_mapping ?? [];
        $timezone = $batch->source_timezone ?: 'UTC';

        $sheet = Excel::toCollection(null, $batch->file_path, 'local')->first();

        if ($sheet === null || $sheet->isEmpty()) {
            return ['totalRows' => 0, 'importedRows' => 0, 'duplicateRows' => 0, 'errorRows' => 0, 'rowErrors' => []];
        }

        $headerIndex = $this->buildHeaderIndex($sheet->first());

        foreach (['symbol', 'side', 'quantity', 'entry_price'] as $requiredTarget) {
            $headerText = $mapping[$requiredTarget] ?? null;
            if ($headerText === null || $headerText === '' || !array_key_exists($headerText, $headerIndex)) {
                throw new RuntimeException("Mapped column for \"{$requiredTarget}\" was not found in the file's header row.");
            }
        }

        // Existing hashes for this user, loaded once so per-row duplicate checks
        // never have to hit the database and every duplicate is skipped before insert.
        $seenHashes = ImportedTrade::query()
            ->where('adm_user_id', $batch->adm_user_id)
            ->pluck('source_row_hash')
            ->flip()
            ->all();

        $totalRows = 0;
        $duplicateRows = 0;
        $errorRows = 0;
        $importedRows = 0;
        $rowErrors = [];
        $pendingRows = [];

        foreach ($sheet as $index => $row) {
            if ($index === 0) {
                continue; // header row
            }

            $totalRows++;
            $rowNumber = $index + 1; // 1-based, matching the file's line number (line 1 = header)

            try {
                $prepared = $this->prepareRow($row, $mapping, $headerIndex, $timezone, $batch->adm_user_id, $batch->broker);

                if (isset($seenHashes[$prepared['source_row_hash']])) {
                    $duplicateRows++;
                    continue;
                }

                $seenHashes[$prepared['source_row_hash']] = true;
                $prepared['imported_trade_batch_id'] = $batch->id;
                $prepared['created_at'] = now();
                $prepared['updated_at'] = now();
                $pendingRows[] = $prepared;

                if (count($pendingRows) >= self::CHUNK_SIZE) {
                    $importedRows += $this->insertChunk($pendingRows);
                    $pendingRows = [];
                }
            } catch (Throwable $e) {
                $errorRows++;
                if (count($rowErrors) < self::MAX_ROW_ERRORS) {
                    $rowErrors[] = ['row' => $rowNumber, 'message' => $e->getMessage()];
                }
            }
        }

        if ($pendingRows) {
            $importedRows += $this->insertChunk($pendingRows);
        }

        return [
            'totalRows' => $totalRows,
            'importedRows' => $importedRows,
            'duplicateRows' => $duplicateRows,
            'errorRows' => $errorRows,
            'rowErrors' => $rowErrors,
        ];
    }

    /**
     * Insert a chunk of prepared rows, ignoring any unique-constraint clash
     * (e.g. a concurrent duplicate import racing this job) instead of
     * failing the whole batch.
     */
    private function insertChunk(array $rows): int
    {
        return (int) ImportedTrade::insertOrIgnore($rows);
    }

    private function buildHeaderIndex($headerRow): array
    {
        $headerIndex = [];

        if (!$headerRow) {
            return $headerIndex;
        }

        foreach ($headerRow as $columnIndex => $value) {
            $key = is_string($value) ? trim($value) : $value;
            if ($key === null || $key === '') {
                continue;
            }
            if (!array_key_exists($key, $headerIndex)) {
                $headerIndex[$key] = $columnIndex;
            }
        }

        return $headerIndex;
    }

    private function cell($row, array $mapping, array $headerIndex, string $target)
    {
        $headerText = $mapping[$target] ?? null;
        if ($headerText === null || $headerText === '' || !array_key_exists($headerText, $headerIndex)) {
            return null;
        }

        $value = $row[$headerIndex[$headerText]] ?? null;

        return is_string($value) ? trim($value) : $value;
    }

    private function prepareRow($row, array $mapping, array $headerIndex, string $timezone, int $admUserId, ?string $broker): array
    {
        $symbol = $this->normalizeSymbol($this->cell($row, $mapping, $headerIndex, 'symbol'));
        $side = $this->normalizeSide($this->cell($row, $mapping, $headerIndex, 'side'));
        $quantity = $this->parseDecimal($this->cell($row, $mapping, $headerIndex, 'quantity'), true, 'quantity');
        $entryPrice = $this->parseDecimal($this->cell($row, $mapping, $headerIndex, 'entry_price'), true, 'entry price');
        $exitPrice = $this->parseDecimal($this->cell($row, $mapping, $headerIndex, 'exit_price'), false, 'exit price');
        $fee = $this->parseDecimal($this->cell($row, $mapping, $headerIndex, 'fee'), false, 'fee') ?? 0;
        $realizedPnl = $this->parseDecimal($this->cell($row, $mapping, $headerIndex, 'realized_pnl'), false, 'realized pnl');
        $openedAt = $this->parseTimestamp($this->cell($row, $mapping, $headerIndex, 'opened_at_time'), $timezone, 'opened at');
        $closedAt = $this->parseTimestamp($this->cell($row, $mapping, $headerIndex, 'closed_at_time'), $timezone, 'closed at');

        $rawRow = is_iterable($row) ? (is_array($row) ? $row : $row->all()) : [$row];

        $hash = hash('sha256', implode('|', [
            $admUserId,
            $symbol,
            $side,
            $quantity,
            $entryPrice,
            $exitPrice ?? '',
            $openedAt ?? '',
            $closedAt ?? '',
        ]));

        return [
            'adm_user_id' => $admUserId,
            'broker' => $broker,
            'symbol' => $symbol,
            'side' => $side,
            'quantity' => $quantity,
            'entry_price' => $entryPrice,
            'exit_price' => $exitPrice,
            'fee' => $fee,
            'realized_pnl' => $realizedPnl,
            'opened_at_time' => $openedAt,
            'closed_at_time' => $closedAt,
            'source_row_hash' => $hash,
            'raw_row' => json_encode($rawRow),
        ];
    }

    private function normalizeSymbol($raw): string
    {
        if ($raw === null || trim((string) $raw) === '') {
            throw new RuntimeException('Missing symbol value.');
        }

        $symbol = preg_replace('/[^A-Z0-9]/', '', strtoupper((string) $raw));

        if ($symbol === '' || $symbol === null) {
            throw new RuntimeException("Symbol value \"{$raw}\" normalized to an empty string.");
        }

        return $symbol;
    }

    private function normalizeSide($raw): string
    {
        if ($raw === null || trim((string) $raw) === '') {
            throw new RuntimeException('Missing side value.');
        }

        $key = strtolower(trim((string) $raw));

        return match ($key) {
            'buy', 'long', 'b', 'l' => 'long',
            'sell', 'short', 's' => 'short',
            default => throw new RuntimeException("Unrecognized side value: \"{$raw}\"."),
        };
    }

    private function parseDecimal($raw, bool $required, string $label): ?float
    {
        if ($raw === null || $raw === '') {
            if ($required) {
                throw new RuntimeException("Missing {$label} value.");
            }

            return null;
        }

        $normalized = is_string($raw) ? preg_replace('/[,\s]/', '', $raw) : $raw;

        if (!is_numeric($normalized)) {
            throw new RuntimeException("Invalid {$label} value: \"{$raw}\".");
        }

        return (float) $normalized;
    }

    private function parseTimestamp($raw, string $timezone, string $label): ?int
    {
        if ($raw === null || trim((string) $raw) === '') {
            return null;
        }

        try {
            return Carbon::parse((string) $raw, $timezone)->utc()->getTimestamp();
        } catch (Throwable $e) {
            throw new RuntimeException("Invalid {$label} timestamp: \"{$raw}\".");
        }
    }
}
