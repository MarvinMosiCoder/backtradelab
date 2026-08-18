<?php

namespace Tests\Feature;

use App\Http\Controllers\ImportedTradeController;
use App\Http\Middleware\HandleInertiaRequests;
use App\Jobs\ProcessImportedTradesBatch;
use App\Models\AdmUser;
use App\Models\ImportedTrade;
use App\Models\ImportedTradeBatch;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImportedTradeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated imported-trade feature tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        $this->withoutMiddleware(HandleInertiaRequests::class);
        $this->createSchema();

        Storage::fake('local');

        Route::middleware(['web', 'auth'])->group(function () {
            Route::post('/_test/imported-trades/batches/preview', [ImportedTradeController::class, 'preview']);
            Route::post('/_test/imported-trades/batches/{batch}/commit', [ImportedTradeController::class, 'commit']);
            Route::get('/_test/imported-trades/batches', [ImportedTradeController::class, 'batches']);
            Route::delete('/_test/imported-trades/batches/{batch}', [ImportedTradeController::class, 'destroyBatch']);
            Route::get('/_test/imported-trades/items', [ImportedTradeController::class, 'items']);
        });
    }

    public function test_preview_stores_file_privately_and_returns_headers_with_a_mapping_batch(): void
    {
        $user = $this->user('trader@example.test');
        $csv = "Date,Pair,Direction,Size,Entry,Exit,Fee\n2024-01-05 09:30:00,BTC-USDT,Buy,0.5,40000,41000,2.5\n";
        $file = UploadedFile::fake()->createWithContent('fills.csv', $csv);

        $response = $this->actingAs($user)->post('/_test/imported-trades/batches/preview', [
            'broker' => 'Kraken',
            'file' => $file,
        ])->assertOk();

        $response->assertJsonPath('headers.0', 'Date');
        $batchId = $response->json('batchId');
        $this->assertNotNull($batchId);

        $batch = ImportedTradeBatch::find($batchId);
        $this->assertSame($user->id, $batch->adm_user_id);
        $this->assertSame('mapping', $batch->status);
        $this->assertSame('Kraken', $batch->broker);
        $this->assertNotNull($batch->file_path);
        Storage::disk('local')->assertExists($batch->file_path);
    }

    public function test_commit_requires_required_mapping_fields_and_a_real_timezone(): void
    {
        $user = $this->user('trader@example.test');
        $batch = $this->makeBatch($user, "Date,Pair,Direction,Size,Entry\n2024-01-05,BTCUSDT,buy,1,100\n");

        $this->actingAs($user)->postJson("/_test/imported-trades/batches/{$batch->id}/commit", [
            'column_mapping' => ['symbol' => 'Pair'],
            'source_timezone' => 'Not/A_Zone',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['column_mapping.side', 'column_mapping.quantity', 'column_mapping.entry_price', 'source_timezone']);
    }

    public function test_commit_dispatches_the_import_job_without_running_it(): void
    {
        Queue::fake();

        $user = $this->user('trader@example.test');
        $batch = $this->makeBatch($user, "Date,Pair,Direction,Size,Entry\n2024-01-05,BTCUSDT,buy,1,100\n");

        $this->actingAs($user)->postJson("/_test/imported-trades/batches/{$batch->id}/commit", [
            'column_mapping' => [
                'symbol' => 'Pair',
                'side' => 'Direction',
                'quantity' => 'Size',
                'entry_price' => 'Entry',
            ],
            'source_timezone' => 'America/New_York',
        ])->assertOk()->assertJsonPath('batch.status', 'pending');

        $this->assertSame('pending', $batch->fresh()->status);
        Queue::assertPushed(ProcessImportedTradesBatch::class, 1);
    }

    public function test_commit_rejects_files_over_the_twenty_thousand_row_cap(): void
    {
        Queue::fake();

        $user = $this->user('trader@example.test');
        $csv = "Date,Pair,Direction,Size,Entry\n";
        for ($i = 0; $i < 20001; $i++) {
            $csv .= "2024-01-05,BTCUSDT,buy,1,100\n";
        }
        $batch = $this->makeBatch($user, $csv);

        $this->actingAs($user)->postJson("/_test/imported-trades/batches/{$batch->id}/commit", [
            'column_mapping' => [
                'symbol' => 'Pair',
                'side' => 'Direction',
                'quantity' => 'Size',
                'entry_price' => 'Entry',
            ],
            'source_timezone' => 'UTC',
        ])->assertStatus(422);

        $this->assertSame('mapping', $batch->fresh()->status);
        Queue::assertNotPushed(ProcessImportedTradesBatch::class);
    }

    public function test_job_normalizes_symbol_side_timezone_and_dedupes_repeated_runs(): void
    {
        $user = $this->user('trader@example.test');

        // Row 1: "btc-usdt" + "Buy" normalize to BTCUSDT/long; the timestamp is a known
        // fixture in America/New_York (UTC-5 in January) which must convert to UTC.
        // Row 2: covers the "short" synonym via "Sell".
        $csv = "Date,Pair,Direction,Size,Entry,Exit\n"
            . "2024-01-05 09:30:00,btc-usdt,Buy,0.5,40000,41000\n"
            . "2024-01-06 10:00:00,ETH/USDT,Sell,2,2000,1900\n";

        $batch = $this->makeBatch($user, $csv, [
            'symbol' => 'Pair',
            'side' => 'Direction',
            'quantity' => 'Size',
            'entry_price' => 'Entry',
            'exit_price' => 'Exit',
            'opened_at_time' => 'Date',
        ], 'America/New_York');

        (new ProcessImportedTradesBatch($batch->id))->handle();

        $batch->refresh();
        $this->assertSame('ready', $batch->status);
        $this->assertSame(2, $batch->total_rows);
        $this->assertSame(2, $batch->imported_rows);
        $this->assertSame(0, $batch->duplicate_rows);
        $this->assertSame(0, $batch->error_rows);
        Storage::disk('local')->assertMissing($batch->file_path);

        $trades = ImportedTrade::where('adm_user_id', $user->id)->orderBy('id')->get();
        $this->assertCount(2, $trades);

        $first = $trades->first();
        $this->assertSame('BTCUSDT', $first->symbol);
        $this->assertSame('long', $first->side);
        // 2024-01-05 09:30:00 America/New_York (UTC-5 in January) => 14:30:00 UTC.
        $this->assertSame(gmmktime(14, 30, 0, 1, 5, 2024), $first->opened_at_time);

        $second = $trades->last();
        $this->assertSame('ETHUSDT', $second->symbol);
        $this->assertSame('short', $second->side);

        // Re-running the same file for the same batch should treat both rows as duplicates
        // and must not violate the (adm_user_id, source_row_hash) unique index.
        $secondBatch = $this->makeBatch($user, $csv, [
            'symbol' => 'Pair',
            'side' => 'Direction',
            'quantity' => 'Size',
            'entry_price' => 'Entry',
            'exit_price' => 'Exit',
            'opened_at_time' => 'Date',
        ], 'America/New_York');

        (new ProcessImportedTradesBatch($secondBatch->id))->handle();

        $secondBatch->refresh();
        $this->assertSame('ready', $secondBatch->status);
        $this->assertSame(2, $secondBatch->duplicate_rows);
        $this->assertSame(0, $secondBatch->imported_rows);
        $this->assertSame(2, ImportedTrade::where('adm_user_id', $user->id)->count());
    }

    public function test_job_records_row_errors_for_unrecognized_side_without_failing_the_batch(): void
    {
        $user = $this->user('trader@example.test');
        $csv = "Date,Pair,Direction,Size,Entry\n"
            . "2024-01-05,BTCUSDT,buy,1,100\n"
            . "2024-01-05,BTCUSDT,sideways,1,100\n";

        $batch = $this->makeBatch($user, $csv, [
            'symbol' => 'Pair',
            'side' => 'Direction',
            'quantity' => 'Size',
            'entry_price' => 'Entry',
        ], 'UTC');

        (new ProcessImportedTradesBatch($batch->id))->handle();

        $batch->refresh();
        $this->assertSame('ready', $batch->status);
        $this->assertSame(1, $batch->imported_rows);
        $this->assertSame(1, $batch->error_rows);
        $this->assertCount(1, $batch->row_errors);
        $this->assertSame(3, $batch->row_errors[0]['row']);
    }

    public function test_destroy_batch_and_items_are_scoped_to_the_owning_user(): void
    {
        $owner = $this->user('owner@example.test');
        $other = $this->user('other@example.test');

        $batch = $this->makeBatch($owner, "Date,Pair,Direction,Size,Entry\n2024-01-05,BTCUSDT,buy,1,100\n");
        (new ProcessImportedTradesBatch($this->commitBatch($batch)->id))->handle();

        $this->actingAs($other)->getJson('/_test/imported-trades/items?batch_id='.$batch->id)
            ->assertOk()
            ->assertJsonCount(0, 'trades');

        $this->actingAs($other)->deleteJson("/_test/imported-trades/batches/{$batch->id}")
            ->assertNotFound();

        $this->assertNotNull(ImportedTradeBatch::find($batch->id));

        $this->actingAs($owner)->getJson('/_test/imported-trades/items?batch_id='.$batch->id)
            ->assertOk()
            ->assertJsonCount(1, 'trades');

        $this->actingAs($owner)->deleteJson("/_test/imported-trades/batches/{$batch->id}")
            ->assertOk();

        $this->assertNull(ImportedTradeBatch::find($batch->id));
        $this->assertSame(0, ImportedTrade::where('imported_trade_batch_id', $batch->id)->count());
    }

    private function createSchema(): void
    {
        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->string('timezone')->nullable();
            // AdmUser::boot() unconditionally writes this attribute on every create().
            $table->unsignedBigInteger('id_adm_privileges')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });

        Schema::create('adm_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained()->onDelete('cascade');
            $table->string('type')->default('info');
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('content');
            $table->json('metadata')->nullable();
            $table->string('url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('dismissed_at')->nullable();
            $table->timestamps();

            $table->unique(['source_type', 'source_id'], 'adm_notifications_source_unique');
        });

        Schema::create('imported_trade_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->string('broker', 64)->nullable();
            $table->string('original_filename')->nullable();
            $table->string('file_path')->nullable();
            $table->json('column_mapping')->nullable();
            $table->string('source_timezone', 64)->nullable();
            $table->string('status', 16)->default('mapping');
            $table->unsignedInteger('total_rows')->nullable();
            $table->unsignedInteger('imported_rows')->default(0);
            $table->unsignedInteger('duplicate_rows')->default(0);
            $table->unsignedInteger('error_rows')->default(0);
            $table->text('error')->nullable();
            $table->json('row_errors')->nullable();
            $table->timestamps();
        });

        Schema::create('imported_trades', function (Blueprint $table) {
            $table->id();
            $table->foreignId('adm_user_id')->constrained('adm_users')->cascadeOnDelete();
            $table->foreignId('imported_trade_batch_id')->constrained('imported_trade_batches')->cascadeOnDelete();
            $table->string('broker', 64)->nullable();
            $table->string('symbol', 32);
            $table->string('side', 8);
            $table->decimal('quantity', 24, 10);
            $table->decimal('entry_price', 24, 8);
            $table->decimal('exit_price', 24, 8)->nullable();
            $table->decimal('fee', 24, 8)->default(0);
            $table->decimal('realized_pnl', 24, 8)->nullable();
            $table->unsignedBigInteger('opened_at_time')->nullable();
            $table->unsignedBigInteger('closed_at_time')->nullable();
            $table->string('source_row_hash', 64);
            $table->json('raw_row')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['adm_user_id', 'source_row_hash']);
        });
    }

    private function user(string $email): AdmUser
    {
        // AdmUser::boot() unconditionally overwrites name/email from the currently bound
        // request on every create() (it's normally invoked from an admin-form submission).
        // Outside of an HTTP call there is no such request yet, so seed one here.
        request()->merge(['name' => 'Trader', 'email' => $email]);

        return AdmUser::query()->create([
            'name' => 'Trader',
            'email' => $email,
            'password' => 'password',
            'status' => 'ACTIVE',
        ]);
    }

    /**
     * Create a batch row with a real CSV already written to the faked 'local' disk,
     * mirroring what preview() would have produced.
     */
    private function makeBatch(AdmUser $user, string $csv, array $columnMapping = [], ?string $timezone = null): ImportedTradeBatch
    {
        $path = "imported-trades/{$user->id}/".uniqid('fills-', true).'.csv';
        Storage::disk('local')->put($path, $csv);

        return ImportedTradeBatch::create([
            'adm_user_id' => $user->id,
            'original_filename' => 'fills.csv',
            'file_path' => $path,
            'column_mapping' => $columnMapping ?: null,
            'source_timezone' => $timezone,
            'status' => 'mapping',
        ]);
    }

    private function commitBatch(ImportedTradeBatch $batch): ImportedTradeBatch
    {
        $batch->update([
            'column_mapping' => [
                'symbol' => 'Pair',
                'side' => 'Direction',
                'quantity' => 'Size',
                'entry_price' => 'Entry',
            ],
            'source_timezone' => 'UTC',
            'status' => 'pending',
        ]);

        return $batch;
    }
}
