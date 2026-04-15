<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EnrollmentList>
 */
class EnrollmentListFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sales_order_no' => fake()->numerify('#######'),
            'item_code' => fake()->numerify('########'),
            'serial_number' => fake()->numerify('#######'),
            'transaction_id' => fake()->numerify('######') . 'asea-asedawec2-aw3qcawe',
            'dep_status' => fake()->randomElement(['Success', "Error"]),
            'status_message' => fake()->sentence(),
            'enrollment_status' => fake()->randomElement(['Completed', "Failed"]),
        ];
    }
}
