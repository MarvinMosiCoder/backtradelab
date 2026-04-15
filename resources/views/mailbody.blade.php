<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            color: #333333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #ffffff;
            text-align: center;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header img {
            max-width: 150px;
        }
        .content {
            padding: 20px;
        }
        .button {
            display: inline-block;
            padding: 12px 25px;
            margin: 20px 0;
            color: #ffffff;
            background-color: #3c8dbc;
            text-decoration: none;
            border-radius: 5px;
        }
        .footer {
            padding: 20px;
            font-size: 12px;
            color: #666666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img style="width: 50px">
        </div>
        <div class="content">
            <h2>Password Reset</h2>
            <p>If you've lost your password or wish to reset it, use the link below to get started.</p>
            <p>
                <a href="{{ url('/reset_password_email/' . $email) }}" class="button" style="color: white">Reset Your Password</a>
            </p>
            <p>If you did not request a password reset, you can safely ignore this email. Only a person with access to your email can reset your account password.</p>
        </div>
        <div class="footer">
            <p>&copy; {{ date('Y') }} VRAM. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
