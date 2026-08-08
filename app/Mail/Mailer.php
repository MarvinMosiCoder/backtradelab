<?php

namespace App\Mail;

use App\Models\AdmModels\AdmSettings;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class Mailer extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */

    public $subject, $email;

    public function __construct($subject, $email)
    {
        $this->subject = $subject;
        $this->email = $email;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(config('mail.from.address'), self::systemName()),
            subject: $this->subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'mailbody',
            with: ['systemName' => self::systemName()],
        );
    }

    /**
     * The configured application name (adm_settings.appname), falling back to config('app.name').
     * This is the single source of truth used everywhere else in the app (navbars, login pages,
     * browser tab title) — outgoing mail should never show a different name than the UI does.
     */
    private static function systemName(): string
    {
        return AdmSettings::where('name', 'appname')->value('content') ?: config('app.name');
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
