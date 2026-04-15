<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Order>
 */
class OrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sales_order_no' => fake()->numerify('#######') ,
            'customer_name' => 'Acme Corporation',
            'order_ref_no' => fake()->numerify('###########'),
            'dep_order' => 1,
            'enrollment_status' => fake()->randomElement(['Completed', "Failed"]),
            'order_date' => date('Y-m-d'),
        ];
    }
}
