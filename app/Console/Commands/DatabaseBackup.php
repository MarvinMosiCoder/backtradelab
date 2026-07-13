<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use RuntimeException;
use Symfony\Component\Process\Process;

class DatabaseBackup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'db:backup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Run database backup';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $ds = DIRECTORY_SEPARATOR;

        $connection = config('database.default');
        $databaseConfig = config("database.connections.{$connection}", []);
        $host = $databaseConfig['host'] ?? null;
        $port = $databaseConfig['port'] ?? 3306;
        $username = $databaseConfig['username'] ?? null;
        $password = $databaseConfig['password'] ?? null;
        $database = $databaseConfig['database'] ?? null;

        if ($connection !== 'mysql' || !$host || !$username || !$database) {
            throw new RuntimeException('The database backup command requires a configured MySQL connection.');
        }

        $ts = time();

        $path = storage_path() . $ds . 'backups' . $ds . date('Y', $ts) . $ds . date('m', $ts) . $ds . date('d', $ts) . $ds;
        $file = date('Y-m-d-His', $ts) . '-dump-' . $database . '.sql';
        if (!is_dir($path)) {
            mkdir($path, 0755, true);
        }

        $process = new Process([
            'mysqldump',
            '--host='.(string) $host,
            '--port='.(string) $port,
            '--user='.(string) $username,
            '--result-file='.$path.$file,
            (string) $database,
        ], null, $password !== null ? ['MYSQL_PWD' => (string) $password] : null);
        $process->setTimeout(null);
        $process->mustRun();

        $this->info("Database backup created at {$path}{$file}");

        return self::SUCCESS;
    }
}
