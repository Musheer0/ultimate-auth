import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AUTH_EVENTS } from '../constants/events';
import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export function createEmailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function otpTemplate({
  title,
  description,
  otp,
}: {
  title: string;
  description: string;
  otp: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f4f5;
        font-family: Arial, Helvetica, sans-serif;
        color: #18181b;
      ">
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="padding: 40px 16px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width: 480px;
                  background-color: #ffffff;
                  border-radius: 12px;
                  overflow: hidden;
                  border: 1px solid #e4e4e7;
                "
              >
                <tr>
                  <td style="padding: 32px;">

                    <h1 style="
                      margin: 0 0 16px;
                      font-size: 24px;
                      line-height: 32px;
                      color: #18181b;
                    ">
                      ${title}
                    </h1>

                    <p style="
                      margin: 0 0 24px;
                      font-size: 15px;
                      line-height: 24px;
                      color: #52525b;
                    ">
                      ${description}
                    </p>

                    <div style="
                      padding: 20px;
                      background-color: #f4f4f5;
                      border-radius: 8px;
                      text-align: center;
                      margin-bottom: 24px;
                    ">
                      <span style="
                        font-size: 32px;
                        font-weight: 700;
                        letter-spacing: 8px;
                        color: #18181b;
                      ">
                        ${otp}
                      </span>
                    </div>

                    <p style="
                      margin: 0 0 8px;
                      font-size: 13px;
                      line-height: 20px;
                      color: #71717a;
                    ">
                      This code will expire soon. Do not share it with anyone.
                    </p>

                    <p style="
                      margin: 24px 0 0;
                      padding-top: 20px;
                      border-top: 1px solid #e4e4e7;
                      font-size: 12px;
                      line-height: 18px;
                      color: #a1a1aa;
                    ">
                      If you didn't request this email, you can safely ignore it.
                    </p>

                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

@Injectable()
export class EmailServiceService {
  private transporter: nodemailer.Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
  >;

  constructor() {
 
    this.transporter = createEmailTransport();
  }

  @OnEvent(AUTH_EVENTS.USER_VERIFICATION)
  async handleRegistrationEmail(data: { otp: string; email: string }) {
    await this.transporter.sendMail({
      to: data.email,
      subject: 'Your Email Verification Code',
      html: otpTemplate({
        title: 'Verify your email',
        description:
          'Use the verification code below to verify your email address.',
        otp: data.otp,
      }),
    });
  }

  @OnEvent(AUTH_EVENTS.USER_RESET_PASSWORD)
  async handleResetPasswordEmail(data: { otp: string; email: string }) {
    await this.transporter.sendMail({
      to: data.email,
      subject: 'Your Password Reset Code',
      html: otpTemplate({
        title: 'Reset your password',
        description:
          'Use the code below to continue with your password reset.',
        otp: data.otp,
      }),
    });
  }
}