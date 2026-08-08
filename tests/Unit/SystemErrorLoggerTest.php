<?php

namespace Tests\Unit;

use App\Services\SystemErrorLogger;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\TestCase;

class SystemErrorLoggerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated logger tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('system_error_logs', function (Blueprint $table) {
            $table->id();
            $table->string('area', 40)->default('general');
            $table->string('level', 20)->default('error');
            $table->string('exception_class');
            $table->text('message');
            $table->string('file')->nullable();
            $table->unsignedInteger('line')->nullable();
            $table->longText('trace')->nullable();
            $table->string('url')->nullable();
            $table->string('method', 10)->nullable();
            $table->string('ip', 45)->nullable();
            $table->unsignedBigInteger('adm_user_id')->nullable();
            $table->json('context')->nullable();
            $table->unsignedInteger('occurrences')->default(1);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function test_log_persists_an_exception_with_classified_area(): void
    {
        $exception = new RuntimeException('PayMongo checkout failed.');
        app(SystemErrorLogger::class)->log($exception);

        $this->assertSame(1, DB::table('system_error_logs')->count());
        $row = DB::table('system_error_logs')->first();
        $this->assertSame('general', $row->area); // this test file's own path has no payments/backtest keyword
        $this->assertSame(RuntimeException::class, $row->exception_class);
        $this->assertSame('PayMongo checkout failed.', $row->message);
        $this->assertSame(1, $row->occurrences);
    }

    public function test_repeated_identical_exception_within_the_hour_increments_occurrences_instead_of_inserting(): void
    {
        $exception = new RuntimeException('Duplicate failure.');
        $logger = app(SystemErrorLogger::class);
        $logger->log($exception);
        $logger->log($exception);
        $logger->log($exception);

        $this->assertSame(1, DB::table('system_error_logs')->count());
        $this->assertSame(3, DB::table('system_error_logs')->value('occurrences'));
    }

    public function test_a_resolved_log_is_not_merged_into_and_gets_a_fresh_row_instead(): void
    {
        $exception = new RuntimeException('Resurfaced failure.');
        $logger = app(SystemErrorLogger::class);
        $logger->log($exception);
        DB::table('system_error_logs')->update(['resolved_at' => now()]);

        $logger->log($exception);

        $this->assertSame(2, DB::table('system_error_logs')->count());
    }

    public function test_logging_never_throws_even_if_persistence_is_impossible(): void
    {
        Schema::drop('system_error_logs');
        $logger = app(SystemErrorLogger::class);

        $logger->log(new RuntimeException('No table to write to.'));
        $this->assertTrue(true);
    }
}
