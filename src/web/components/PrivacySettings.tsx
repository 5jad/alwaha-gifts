type Props = { trackingEnabled: boolean; onTrackingChange: () => void };

export default function PrivacySettings({ trackingEnabled, onTrackingChange }: Props) {
  return (
    <details className="store-privacy">
      <summary>الخصوصية وحماية البيانات</summary>
      <div className="store-privacy-content">
        <strong>خصوصية الطلب والقياس</strong>
        <p>
          بيانات طلبك تُرسل للتاجر للتأكيد والتوصيل، وتُحفظ في سجل المتجر الخاص الذي لا يطلع عليه إلا فريق التوصيل المخوّل. نستخدم Meta لقياس الزيارات والطلبات بمعلومات المتصفح الفنية وقيمة الطلب وكميته، دون مشاركة بياناتك الحساسة مع أي طرف ثالث.
        </p>
        <p>
          {trackingEnabled
            ? "القياس والتحليلات مفعّلة في هذا المتصفح."
            : "القياس متوقف؛ يمكنك الطلب بصورة طبيعية. نحترم اختيارك وإشارة رفض مشاركة البيانات GPC إن كانت مفعّلة."}
        </p>
        <button type="button" onClick={onTrackingChange}>
          {trackingEnabled ? "إيقاف القياس في هذا المتصفح" : "طلب تشغيل القياس في هذا المتصفح"}
        </button>
      </div>
    </details>
  );
}
