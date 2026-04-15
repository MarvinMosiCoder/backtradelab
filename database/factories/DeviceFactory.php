<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Device>
 */
class DeviceFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'item_code' => fake()->numerify('########'),
            'item_description' => fake()->paragraph(),
            'serial_number' => fake()->numerify('#######'),
            'customer_name' => 'Acme Corporation'
        ];
    }
}
