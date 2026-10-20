package vn.edu.hust.homestay.auth.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Service gửi email thông báo và xác thực (Tuần 2).
 * Sử dụng spring-boot-starter-mail kết nối tới Gmail SMTP.
 * Ngày thực hiện: 19/10/2026
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:}")
    private String mailFrom;

    @Value("${app.mail.sender-name:Homestay Booking System}")
    private String senderName;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    /**
     * Gửi email đặt lại mật khẩu với giao diện HTML chuyên nghiệp.
     *
     * @param toEmail       Địa chỉ email người nhận
     * @param recipientName Họ tên người nhận
     * @param resetToken    Token đặt lại mật khẩu (dạng thô)
     */
    public void sendPasswordResetEmail(String toEmail, String recipientName, String resetToken) {
        String cleanRecipientName = (recipientName != null && !recipientName.isBlank()) ? recipientName : "Quý khách";
        String resetUrl = frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + resetToken;

        if (mailUsername == null || mailUsername.isBlank() || mailPassword == null || mailPassword.isBlank()) {
            log.warn("SMTP chưa được cấu hình đầy đủ; email đặt lại mật khẩu không được gửi.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(mailFrom == null || mailFrom.isBlank() ? mailUsername : mailFrom, senderName);
            helper.setTo(toEmail);
            helper.setSubject("[Homestay] Yêu cầu đặt lại mật khẩu tài khoản");
            helper.setText(buildResetPasswordHtml(cleanRecipientName, toEmail, resetUrl), true);

            mailSender.send(message);
            log.info("Email đặt lại mật khẩu đã được gửi.");
        } catch (Exception ex) {
            log.error("Không thể gửi email đặt lại mật khẩu qua SMTP.", ex);
        }
    }

    /**
     * Xây dựng nội dung HTML email chuẩn hiển thị trên mọi thiết bị.
     */
    private String buildResetPasswordHtml(String recipientName, String toEmail, String resetUrl) {
        String safeRecipientName = HtmlUtils.htmlEscape(recipientName);
        String safeEmail = HtmlUtils.htmlEscape(toEmail);
        String safeResetUrl = HtmlUtils.htmlEscape(resetUrl);

        return """
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Đặt lại mật khẩu Homestay</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f7f7f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #222222; line-height: 1.6;">
              <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f7f7f7; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%%" max-width="580px" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 28px 32px; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
                          <div style="font-size: 20px; font-weight: 700; color: #FF385C; letter-spacing: -0.5px;">
                            🏡 HOMESTAY BOOKING
                          </div>
                        </td>
                      </tr>
                      <!-- Body -->
                      <tr>
                        <td style="padding: 32px;">
                          <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 16px; color: #222222;">
                            Đặt lại mật khẩu của bạn
                          </h1>
                          <p style="font-size: 15px; margin: 0 0 16px; color: #484848;">
                            Xin chào <strong>%s</strong>,
                          </p>
                          <p style="font-size: 15px; margin: 0 0 24px; color: #484848;">
                            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với email <strong>%s</strong>. Vui lòng bấm vào nút bên dưới để thiết lập mật khẩu mới:
                          </p>
                          <!-- Action Button -->
                          <div style="text-align: center; margin: 28px 0;">
                            <a href="%s" target="_blank" style="display: inline-block; background-color: #FF385C; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(255, 56, 92, 0.25);">
                              Đặt lại mật khẩu ngay
                            </a>
                          </div>
                          <!-- Note & direct link -->
                          <div style="margin-top: 24px; padding: 16px; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #eeeeee;">
                            <p style="font-size: 13px; color: #717171; margin: 0 0 8px;">
                              ⏰ Liên kết này có hiệu lực trong vòng <strong>15 phút</strong> kể từ khi tạo.
                            </p>
                            <p style="font-size: 12px; color: #717171; margin: 0; word-break: break-all;">
                              Nếu nút bấm phía trên không hoạt động, bạn có thể sao chép liên kết sau dán vào trình duyệt:<br/>
                              <a href="%s" style="color: #FF385C; text-decoration: underline;">%s</a>
                            </p>
                          </div>
                          <p style="font-size: 13px; color: #717171; margin: 24px 0 0; line-height: 1.5;">
                            🛡️ <em>Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này. Mật khẩu hiện tại của bạn vẫn được bảo mật tuyệt đối.</em>
                          </p>
                        </td>
                      </tr>
                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #eeeeee; text-align: center; font-size: 12px; color: #888888;">
                          <p style="margin: 0 0 4px;">Hệ thống Quản lý và Đặt phòng Homestay</p>
                          <p style="margin: 0;">Email hệ thống: <a href="mailto:%s" style="color: #666666;">%s</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """.formatted(safeRecipientName, safeEmail, safeResetUrl, safeResetUrl, safeResetUrl,
                HtmlUtils.htmlEscape(mailFrom == null || mailFrom.isBlank() ? mailUsername : mailFrom),
                HtmlUtils.htmlEscape(mailFrom == null || mailFrom.isBlank() ? mailUsername : mailFrom));
    }
}
