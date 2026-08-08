<?php

namespace Tests\Unit;

use App\Models\AdmUser;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AdmUserGenerateUniqueUsernameTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            $this->markTestSkipped('The pdo_sqlite extension is required for isolated username-generation tests.');
        }

        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        DB::purge('sqlite');
        DB::reconnect('sqlite');

        Schema::create('adm_users', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('username', 60)->nullable()->unique();
            $table->string('email')->unique();
            $table->string('status')->default('ACTIVE');
            $table->timestamps();
        });
    }

    public function test_generated_usernames_match_the_expected_format(): void
    {
        $username = AdmUser::generateUniqueUsername();
        $this->assertMatchesRegularExpression('/^User\d{6}$/', $username);
    }

    public function test_repeated_calls_never_collide_with_an_already_taken_username(): void
    {
        $seen = [];
        for ($i = 0; $i < 200; $i++) {
            $username = AdmUser::generateUniqueUsername();
            $this->assertArrayNotHasKey($username, $seen, 'Generated a username that was already handed out.');
            $seen[$username] = true;
            DB::table('adm_users')->insert([
                'name' => 'Test', 'username' => $username, 'email' => 'user'.$i.'@example.test',
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}
