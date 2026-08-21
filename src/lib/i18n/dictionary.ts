import { Locale } from './locales'
import { ConsultationAreaId } from '@/modules/practice-areas'

export interface Dictionary {
  nav: { home: string; practiceAreas: string; team: string; contact: string };
  topbar: { address: string; phone: string; email: string };
  dashboardCta: string;
  practiceAreas: { eyebrow: string; heading: string; cta: string };
  team: { eyebrow: string; heading: string };
  blog: { eyebrow: string; heading: string; readMore: string; viewAll: string; backToHome: string; empty: string };
  footer: {
    contact: string;
    location: string;
    mapNotSet: string;
    rights: string;
    privacy: string;
    disclosure: string;
    cookiePolicy: string;
    onlinePayment: string;
  };
  cookieBanner: {
    message: string;
    policyLinkLabel: string;
    reject: string;
    accept: string;
    closeAriaLabel: string;
  };
  whatsapp: { ariaLabel: string; kvkkTooltip: string };
  chat: { title: string; greeting: string; errorServer: string; errorNetwork: string; errorTimeout: string };
  consultationForm: {
    fullName: string;
    phone: string;
    email: string;
    legalArea: string;
    summaryLabel: string;
    attachLabel: string;
    chooseFile: string;
    channelLabel: string;
    channels: { zoomTeams: string; encryptedCall: string };
    // Anahtar = kanonik practice_area_id slug'ı (src/modules/practice-areas),
    // değer = o dildeki görünen etiket. Eskiden konumsal bir 6-tuple'dı;
    // dizi indeksinin 7 dili birbirine bağlaması kırılgandı, artık slug bağlıyor.
    legalAreas: Record<ConsultationAreaId, string>;
    consent1: string;
    consent2: string;
    disclosureLink: string;
    submit: string;
    sending: string;
    successTitle: string;
    successText: string;
    errorUnsupportedFile: string;
    errorUploadFailed: string;
    errorConsentRequired: string;
    errorNotConfigured: string;
    errorGeneric: string;
    imageUploadLabel: string;
    imageUploadedLabel: string;
    imageDropLabel: string;
    errorInvalidImage: string;
    errorImageUploadFailed: string;
    consultationAgreementLink: string;
  };
}

// NOT: ar/fa/ru çevirileri taslak kalitededir; canlıya almadan önce anadil
// konuşuru gözden geçirmeli (hukuki şablonlardaki "insan onaylı taslak"
// ilkesiyle aynı yaklaşım).
const dictionary: Record<Locale, Dictionary> = {
  tr: {
    nav: { home: 'ANASAYFA', practiceAreas: 'UZMANLIK ALANLARI', team: 'EKİBİMİZ', contact: 'İLETİŞİM' },
    topbar: { address: 'Adres:', phone: 'Telefon:', email: 'E-posta:' },
    dashboardCta: 'DASHBOARD GİRİŞİ',
    practiceAreas: { eyebrow: 'UZMANLIK ALANLARI', heading: 'Uzmanlık Alanlarımız', cta: 'DETAYLI BİLGİ' },
    team: { eyebrow: 'EKİBİMİZ', heading: 'Uzman Kadromuz' },
    blog: { eyebrow: 'BLOG', heading: 'Son Yazılar', readMore: 'Devamını Oku', viewAll: 'Tüm Yazılar', backToHome: 'Ana Sayfaya Dön', empty: 'Henüz yazı yayınlanmadı.' },
    footer: {
      contact: 'İletişim',
      location: 'Konumumuz',
      mapNotSet: 'Harita linki ayarlanmadı',
      rights: 'Tüm Hakları Saklıdır.',
      privacy: 'Gizlilik Politikası',
      disclosure: 'Aydınlatma Metni',
      cookiePolicy: 'Çerez Politikası',
      onlinePayment: 'Online Ödeme',
    },
    cookieBanner: {
      message: 'Bu web sitesi yalnızca sitenin çalışması için zorunlu olan (dil/tema tercihi, form taslağı gibi) teknik verileri tarayıcınızda saklar; herhangi bir üçüncü taraf izleme/reklam çerezi kullanmıyoruz. Tercihiniz aşağıdan kaydedilir — detaylar için',
      policyLinkLabel: 'Çerez Aydınlatma Metni',
      reject: 'Reddet',
      accept: 'Kabul Et',
      closeAriaLabel: 'Kapat',
    },
    whatsapp: { ariaLabel: 'WhatsApp ile iletişime geçin', kvkkTooltip: 'KVKK Aydınlatma Metni' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nSize nasıl yardımcı olabilirim?',
      errorServer: '> Hata: Sunucuya ulaşılamadı.',
      errorNetwork: '> Hata: Ağ bağlantısı koptu.',
      errorTimeout: '> Şu anda yanıt veremiyoruz, lütfen daha sonra tekrar deneyin.',
    },
    consultationForm: {
      fullName: 'Adınız / Soyadınız',
      phone: 'İletişim Numaranız',
      email: 'E-Posta Adresiniz',
      legalArea: 'Görüşme Yapılacak Hukuki Alan',
      summaryLabel: 'Uyuşmazlığın Kısa Özeti',
      attachLabel: 'Belge Ekleyin (opsiyonel, PDF/DOC/görsel, maks. 10MB)',
      chooseFile: 'Dosya seçin veya sürükleyin',
      channelLabel: 'Tercih Edilen Görüşme Kanalı',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'Şifreli Sesli Arama' },
      legalAreas: {
        'bilisim-yz-dijital': 'Bilişim, Yapay Zekâ ve Dijital Haklar',
        'startup': 'Startup ve Girişimcilik Hukuku',
        'uluslararasi-sozlesmeler': 'Uluslararası Sözleşmeler & Mukayeseli Hukuk',
        'bilisim-ceza': 'Bilişim Ceza Hukuku',
        'sirketler-ticaret': 'Şirketler, Ticaret ve Sözleşmeler Hukuku',
        'aile-miras': 'Geleneksel Hukuk Disiplinleri (Aile, Miras, Gayrimenkul)',
      },
      consent1: '1136 sayılı Avukatlık Kanunu uyarınca online danışmanlık hizmetinin ücrete tabi olduğunu ve randevu onay sürecinde tarafıma yasal tarife bilgilendirmesi yapılacağını kabul ediyorum.',
      consent2: 'Aydınlatma Metni kapsamında kişisel verilerimin, hukuki sır saklama yükümlülüğü ve KVKK standartlarında işlenmesine açık rıza gösteriyorum.',
      disclosureLink: 'Aydınlatma Metni',
      submit: 'Randevu Talebi Gönder',
      sending: 'Gönderiliyor...',
      successTitle: 'Talebiniz Alındı',
      successText: 'Büromuz talebinizi inceleyip randevunuzu onaylamak üzere en kısa sürede sizinle iletişime geçecektir.',
      errorUnsupportedFile: 'Desteklenmeyen dosya türü.',
      errorUploadFailed: 'Dosya yüklenemedi.',
      errorConsentRequired: 'Devam etmek için onay kutularını işaretlemelisiniz.',
      errorNotConfigured: 'Sistem yapılandırılmadı: talep gönderilemedi.',
      errorGeneric: 'Talep gönderilirken bir hata oluştu.',
      imageUploadLabel: 'Görsel / Fotoğraf Yükleyin',
      imageUploadedLabel: 'Görsel yüklendi — değiştirmek için tıklayın',
      imageDropLabel: 'Sürükle bırak veya tıklayarak görsel seçin',
      errorInvalidImage: 'Lütfen geçerli bir görsel dosyası yükleyin.',
      errorImageUploadFailed: 'Görsel yüklenirken hata oluştu.',
      consultationAgreementLink: 'Danışmanlık Sözleşmesi',
    },
  },
  en: {
    nav: { home: 'HOME', practiceAreas: 'PRACTICE AREAS', team: 'OUR TEAM', contact: 'CONTACTS' },
    topbar: { address: 'Address:', phone: 'Phone:', email: 'Email:' },
    dashboardCta: 'DASHBOARD LOGIN',
    practiceAreas: { eyebrow: 'PRACTICE AREAS', heading: 'Our Practice Areas', cta: 'LEARN MORE' },
    team: { eyebrow: 'OUR ATTORNEYS', heading: 'Our Expert Team' },
    blog: { eyebrow: 'BLOG', heading: 'Latest Articles', readMore: 'Read More', viewAll: 'View All Articles', backToHome: 'Back to Home', empty: 'No articles published yet.' },
    footer: {
      contact: 'Contact',
      location: 'Our Location',
      mapNotSet: 'Map link not set',
      rights: 'All Rights Reserved.',
      privacy: 'Privacy Policy',
      disclosure: 'Legal Disclosure',
      cookiePolicy: 'Cookie Policy',
      onlinePayment: 'Online Payment',
    },
    cookieBanner: {
      message: 'This website only stores technical data in your browser that is strictly necessary for the site to function (e.g. language/theme preference, form draft); we do not use any third-party tracking or advertising cookies. Your preference is saved below — for details see the',
      policyLinkLabel: 'Cookie Disclosure Notice',
      reject: 'Reject',
      accept: 'Accept',
      closeAriaLabel: 'Close',
    },
    whatsapp: { ariaLabel: 'Contact us on WhatsApp', kvkkTooltip: 'Data Protection Notice' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: "Üste Hukuk Terminal v1.0\nHow can I help you?",
      errorServer: '> Error: Could not reach server.',
      errorNetwork: '> Error: Network connection lost.',
      errorTimeout: '> We cannot respond right now, please try again shortly.',
    },
    consultationForm: {
      fullName: 'Full Name',
      phone: 'Phone Number',
      email: 'Email Address',
      legalArea: 'Legal Area for Consultation',
      summaryLabel: 'Brief Summary of Your Matter',
      attachLabel: 'Attach a document (optional, PDF/DOC/image, max 10MB)',
      chooseFile: 'Choose or drop a file',
      channelLabel: 'Preferred Consultation Channel',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'Encrypted Voice Call' },
      legalAreas: {
        'bilisim-yz-dijital': 'IT, Artificial Intelligence and Digital Rights',
        'startup': 'Startup and Entrepreneurship Law',
        'uluslararasi-sozlesmeler': 'International Contracts & Comparative Law',
        'bilisim-ceza': 'Cybercrime Law',
        'sirketler-ticaret': 'Corporate, Commercial and Contract Law',
        'aile-miras': 'Traditional Legal Disciplines (Family, Inheritance, Real Estate)',
      },
      consent1: 'I acknowledge that, pursuant to Attorney Law No. 1136, the online consultation service is subject to a fee, and that I will be informed of the applicable legal tariff during the appointment confirmation process.',
      consent2: 'I explicitly consent to the processing of my personal data in accordance with the Disclosure Text, subject to the obligation of legal confidentiality and KVKK (Turkish data protection law) standards.',
      disclosureLink: 'Disclosure Text',
      submit: 'Send Consultation Request',
      sending: 'Sending...',
      successTitle: 'Your Request Has Been Received',
      successText: 'Our firm will review your request and contact you shortly to confirm your appointment.',
      errorUnsupportedFile: 'Unsupported file type.',
      errorUploadFailed: 'File upload failed.',
      errorConsentRequired: 'You must accept the consent checkboxes to continue.',
      errorNotConfigured: 'System not configured: request could not be sent.',
      errorGeneric: 'An error occurred while sending the request.',
      imageUploadLabel: 'Upload Image / Photo',
      imageUploadedLabel: 'Image uploaded — click to change',
      imageDropLabel: 'Drag and drop or click to select an image',
      errorInvalidImage: 'Please upload a valid image file.',
      errorImageUploadFailed: 'An error occurred while uploading the image.',
      consultationAgreementLink: 'Consultation Agreement',
    },
  },
  ar: {
    nav: { home: 'الرئيسية', practiceAreas: 'مجالات العمل', team: 'فريقنا', contact: 'اتصل بنا' },
    topbar: { address: 'العنوان:', phone: 'الهاتف:', email: 'البريد الإلكتروني:' },
    dashboardCta: 'الدخول إلى لوحة التحكم',
    practiceAreas: { eyebrow: 'مجالات العمل', heading: 'مجالات ممارستنا', cta: 'مزيد من المعلومات' },
    team: { eyebrow: 'فريقنا', heading: 'فريقنا المتخصص' },
    blog: { eyebrow: 'المدونة', heading: 'أحدث المقالات', readMore: 'قراءة المزيد', viewAll: 'كل المقالات', backToHome: 'العودة للرئيسية', empty: 'لم يتم نشر أي مقالات بعد.' },
    footer: {
      contact: 'اتصل بنا',
      location: 'موقعنا',
      mapNotSet: 'لم يتم تعيين رابط الخريطة',
      rights: 'جميع الحقوق محفوظة.',
      privacy: 'سياسة الخصوصية',
      disclosure: 'بيان الإفصاح',
      cookiePolicy: 'سياسة ملفات تعريف الارتباط',
      onlinePayment: 'الدفع عبر الإنترنت',
    },
    cookieBanner: {
      message: 'يخزن هذا الموقع في متصفحك فقط البيانات التقنية الضرورية لتشغيل الموقع (مثل تفضيل اللغة/السمة، مسودة النموذج)؛ نحن لا نستخدم أي ملفات تعريف ارتباط للتتبع أو الإعلانات من طرف ثالث. يتم حفظ تفضيلك أدناه — للتفاصيل يرجى مراجعة',
      policyLinkLabel: 'نص الإفصاح عن ملفات تعريف الارتباط',
      reject: 'رفض',
      accept: 'قبول',
      closeAriaLabel: 'إغلاق',
    },
    whatsapp: { ariaLabel: 'تواصل معنا عبر واتساب', kvkkTooltip: 'نص الإفصاح عن حماية البيانات' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nكيف يمكنني مساعدتك؟',
      errorServer: '> خطأ: تعذر الوصول إلى الخادم.',
      errorNetwork: '> خطأ: انقطع الاتصال بالشبكة.',
      errorTimeout: '> لا يمكننا الرد الآن، يرجى المحاولة مرة أخرى بعد قليل.',
    },
    consultationForm: {
      fullName: 'الاسم الكامل',
      phone: 'رقم الهاتف',
      email: 'البريد الإلكتروني',
      legalArea: 'المجال القانوني للاستشارة',
      summaryLabel: 'ملخص موجز عن قضيتك',
      attachLabel: 'إرفاق مستند (اختياري، PDF/DOC/صورة، حد أقصى 10 ميغابايت)',
      chooseFile: 'اختر ملفًا أو اسحبه هنا',
      channelLabel: 'قناة الاستشارة المفضلة',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'مكالمة صوتية مشفرة' },
      legalAreas: {
        'bilisim-yz-dijital': 'تكنولوجيا المعلومات والذكاء الاصطناعي والحقوق الرقمية',
        'startup': 'قانون الشركات الناشئة وريادة الأعمال',
        'uluslararasi-sozlesmeler': 'العقود الدولية والقانون المقارن',
        'bilisim-ceza': 'قانون الجرائم الإلكترونية',
        'sirketler-ticaret': 'قانون الشركات والتجارة والعقود',
        'aile-miras': 'المجالات القانونية التقليدية (الأسرة، الميراث، العقارات)',
      },
      consent1: 'أقر بأنه، وفقاً لقانون المحاماة رقم 1136، فإن خدمة الاستشارة عبر الإنترنت خاضعة لرسوم، وسيتم إبلاغي بالتعرفة القانونية المعمول بها أثناء عملية تأكيد الموعد.',
      consent2: 'أوافق صراحةً على معالجة بياناتي الشخصية وفقاً لنص الإفصاح، مع مراعاة الالتزام بالسرية القانونية ومعايير قانون حماية البيانات الشخصية التركي (KVKK).',
      disclosureLink: 'نص الإفصاح',
      submit: 'إرسال طلب الاستشارة',
      sending: 'جارٍ الإرسال...',
      successTitle: 'تم استلام طلبك',
      successText: 'سيقوم مكتبنا بمراجعة طلبك والتواصل معك في أقرب وقت لتأكيد موعدك.',
      errorUnsupportedFile: 'نوع ملف غير مدعوم.',
      errorUploadFailed: 'فشل تحميل الملف.',
      errorConsentRequired: 'يجب عليك تحديد مربعات الموافقة للمتابعة.',
      errorNotConfigured: 'النظام غير مهيأ: تعذر إرسال الطلب.',
      errorGeneric: 'حدث خطأ أثناء إرسال الطلب.',
      imageUploadLabel: 'تحميل صورة / صورة فوتوغرافية',
      imageUploadedLabel: 'تم تحميل الصورة — انقر للتغيير',
      imageDropLabel: 'اسحب وأفلت أو انقر لاختيار صورة',
      errorInvalidImage: 'يرجى تحميل ملف صورة صالح.',
      errorImageUploadFailed: 'حدث خطأ أثناء تحميل الصورة.',
      consultationAgreementLink: 'عقد الاستشارة',
    },
  },
  fa: {
    nav: { home: 'خانه', practiceAreas: 'حوزه‌های فعالیت', team: 'تیم ما', contact: 'تماس با ما' },
    topbar: { address: 'آدرس:', phone: 'تلفن:', email: 'ایمیل:' },
    dashboardCta: 'ورود به داشبورد',
    practiceAreas: { eyebrow: 'حوزه‌های فعالیت', heading: 'حوزه‌های تخصصی ما', cta: 'اطلاعات بیشتر' },
    team: { eyebrow: 'تیم ما', heading: 'تیم متخصص ما' },
    blog: { eyebrow: 'وبلاگ', heading: 'آخرین مقالات', readMore: 'ادامه مطلب', viewAll: 'همه مقالات', backToHome: 'بازگشت به صفحه اصلی', empty: 'هنوز مقاله‌ای منتشر نشده است.' },
    footer: {
      contact: 'تماس با ما',
      location: 'موقعیت ما',
      mapNotSet: 'لینک نقشه تنظیم نشده است',
      rights: 'تمامی حقوق محفوظ است.',
      privacy: 'سیاست حریم خصوصی',
      disclosure: 'بیانیه افشا',
      cookiePolicy: 'سیاست کوکی',
      onlinePayment: 'پرداخت آنلاین',
    },
    cookieBanner: {
      message: 'این وب‌سایت تنها داده‌های فنی ضروری برای عملکرد سایت (مانند تنظیمات زبان/پوسته، پیش‌نویس فرم) را در مرورگر شما ذخیره می‌کند؛ ما از هیچ کوکی ردیابی یا تبلیغاتی شخص ثالث استفاده نمی‌کنیم. تنظیمات شما در زیر ذخیره می‌شود — برای جزئیات به',
      policyLinkLabel: 'متن افشای کوکی',
      reject: 'رد کردن',
      accept: 'پذیرفتن',
      closeAriaLabel: 'بستن',
    },
    whatsapp: { ariaLabel: 'از طریق واتس‌اپ با ما تماس بگیرید', kvkkTooltip: 'متن افشای حفاظت از داده‌ها' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nچگونه می‌توانم به شما کمک کنم؟',
      errorServer: '> خطا: اتصال به سرور برقرار نشد.',
      errorNetwork: '> خطا: اتصال شبکه قطع شد.',
      errorTimeout: '> در حال حاضر امکان پاسخ‌گویی نیست، لطفاً کمی بعد دوباره امتحان کنید.',
    },
    consultationForm: {
      fullName: 'نام و نام خانوادگی',
      phone: 'شماره تماس',
      email: 'آدرس ایمیل',
      legalArea: 'حوزه حقوقی مشاوره',
      summaryLabel: 'خلاصه‌ای کوتاه از موضوع شما',
      attachLabel: 'پیوست سند (اختیاری، PDF/DOC/تصویر، حداکثر ۱۰ مگابایت)',
      chooseFile: 'فایلی انتخاب یا اینجا رها کنید',
      channelLabel: 'کانال ترجیحی مشاوره',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'تماس صوتی رمزگذاری‌شده' },
      legalAreas: {
        'bilisim-yz-dijital': 'فناوری اطلاعات، هوش مصنوعی و حقوق دیجیتال',
        'startup': 'حقوق استارتاپ و کارآفرینی',
        'uluslararasi-sozlesmeler': 'قراردادهای بین‌المللی و حقوق تطبیقی',
        'bilisim-ceza': 'حقوق جرایم رایانه‌ای',
        'sirketler-ticaret': 'حقوق شرکت‌ها، تجارت و قراردادها',
        'aile-miras': 'حوزه‌های حقوقی سنتی (خانواده، ارث، املاک)',
      },
      consent1: 'تأیید می‌کنم که طبق قانون وکالت شماره ۱۱۳۶، خدمات مشاوره آنلاین مشمول هزینه است و در فرآیند تأیید نوبت، تعرفه قانونی مربوطه به من اطلاع داده خواهد شد.',
      consent2: 'من صراحتاً با پردازش اطلاعات شخصی‌ام مطابق با متن افشا، با رعایت الزام رازداری حقوقی و استانداردهای قانون حفاظت از داده‌های شخصی ترکیه (KVKK) موافقت می‌کنم.',
      disclosureLink: 'متن افشا',
      submit: 'ارسال درخواست مشاوره',
      sending: 'در حال ارسال...',
      successTitle: 'درخواست شما دریافت شد',
      successText: 'دفتر ما درخواست شما را بررسی کرده و به‌زودی برای تأیید نوبت با شما تماس خواهد گرفت.',
      errorUnsupportedFile: 'نوع فایل پشتیبانی نمی‌شود.',
      errorUploadFailed: 'بارگذاری فایل ناموفق بود.',
      errorConsentRequired: 'برای ادامه باید کادرهای رضایت را علامت بزنید.',
      errorNotConfigured: 'سیستم پیکربندی نشده است: درخواست ارسال نشد.',
      errorGeneric: 'هنگام ارسال درخواست خطایی رخ داد.',
      imageUploadLabel: 'بارگذاری تصویر / عکس',
      imageUploadedLabel: 'تصویر بارگذاری شد — برای تغییر کلیک کنید',
      imageDropLabel: 'بکشید و رها کنید یا برای انتخاب تصویر کلیک کنید',
      errorInvalidImage: 'لطفاً یک فایل تصویری معتبر بارگذاری کنید.',
      errorImageUploadFailed: 'هنگام بارگذاری تصویر خطایی رخ داد.',
      consultationAgreementLink: 'قرارداد مشاوره',
    },
  },
  ru: {
    nav: { home: 'ГЛАВНАЯ', practiceAreas: 'НАПРАВЛЕНИЯ', team: 'НАША КОМАНДА', contact: 'КОНТАКТЫ' },
    topbar: { address: 'Адрес:', phone: 'Телефон:', email: 'Эл. почта:' },
    dashboardCta: 'ВХОД В ПАНЕЛЬ',
    practiceAreas: { eyebrow: 'НАПРАВЛЕНИЯ', heading: 'Наши направления практики', cta: 'ПОДРОБНЕЕ' },
    team: { eyebrow: 'НАША КОМАНДА', heading: 'Наша команда экспертов' },
    blog: { eyebrow: 'БЛОГ', heading: 'Последние статьи', readMore: 'Читать далее', viewAll: 'Все статьи', backToHome: 'Вернуться на главную', empty: 'Пока нет опубликованных статей.' },
    footer: {
      contact: 'Контакты',
      location: 'Наше расположение',
      mapNotSet: 'Ссылка на карту не задана',
      rights: 'Все права защищены.',
      privacy: 'Политика конфиденциальности',
      disclosure: 'Юридическое уведомление',
      cookiePolicy: 'Политика использования файлов cookie',
      onlinePayment: 'Онлайн-оплата',
    },
    cookieBanner: {
      message: 'Этот сайт сохраняет в вашем браузере только технические данные, строго необходимые для его работы (например, языковые/тематические настройки, черновик формы); мы не используем сторонние файлы cookie для отслеживания или рекламы. Ваш выбор сохраняется ниже — подробности см. в',
      policyLinkLabel: 'Уведомлении об использовании файлов cookie',
      reject: 'Отклонить',
      accept: 'Принять',
      closeAriaLabel: 'Закрыть',
    },
    whatsapp: { ariaLabel: 'Связаться с нами через WhatsApp', kvkkTooltip: 'Уведомление о защите данных' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nЧем я могу вам помочь?',
      errorServer: '> Ошибка: не удалось подключиться к серверу.',
      errorNetwork: '> Ошибка: сетевое соединение потеряно.',
      errorTimeout: '> Сейчас мы не можем ответить, попробуйте, пожалуйста, чуть позже.',
    },
    consultationForm: {
      fullName: 'Ваше имя и фамилия',
      phone: 'Номер телефона',
      email: 'Адрес электронной почты',
      legalArea: 'Область консультации',
      summaryLabel: 'Краткое описание вашего вопроса',
      attachLabel: 'Прикрепить документ (необязательно, PDF/DOC/изображение, макс. 10МБ)',
      chooseFile: 'Выберите или перетащите файл',
      channelLabel: 'Предпочитаемый канал связи',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'Зашифрованный голосовой звонок' },
      legalAreas: {
        'bilisim-yz-dijital': 'ИТ, искусственный интеллект и цифровые права',
        'startup': 'Право стартапов и предпринимательства',
        'uluslararasi-sozlesmeler': 'Международные договоры и сравнительное право',
        'bilisim-ceza': 'Киберпреступность',
        'sirketler-ticaret': 'Корпоративное, коммерческое и договорное право',
        'aile-miras': 'Традиционные отрасли права (семейное, наследственное, недвижимость)',
      },
      consent1: 'Я подтверждаю, что в соответствии с Законом об адвокатуре № 1136 услуга онлайн-консультации подлежит оплате, и что я буду проинформирован(а) о применимом юридическом тарифе в процессе подтверждения записи.',
      consent2: 'Я даю явное согласие на обработку моих персональных данных в соответствии с Уведомлением о защите данных, с соблюдением обязательства о юридической конфиденциальности и стандартов турецкого закона о защите персональных данных (KVKK).',
      disclosureLink: 'Уведомление о защите данных',
      submit: 'Отправить запрос на консультацию',
      sending: 'Отправка...',
      successTitle: 'Ваш запрос получен',
      successText: 'Наша фирма рассмотрит ваш запрос и свяжется с вами в ближайшее время для подтверждения записи.',
      errorUnsupportedFile: 'Неподдерживаемый тип файла.',
      errorUploadFailed: 'Не удалось загрузить файл.',
      errorConsentRequired: 'Чтобы продолжить, необходимо отметить флажки согласия.',
      errorNotConfigured: 'Система не настроена: запрос не может быть отправлен.',
      errorGeneric: 'Произошла ошибка при отправке запроса.',
      imageUploadLabel: 'Загрузить изображение / фото',
      imageUploadedLabel: 'Изображение загружено — нажмите, чтобы изменить',
      imageDropLabel: 'Перетащите или нажмите, чтобы выбрать изображение',
      errorInvalidImage: 'Пожалуйста, загрузите действительный файл изображения.',
      errorImageUploadFailed: 'Произошла ошибка при загрузке изображения.',
      consultationAgreementLink: 'Договор о консультации',
    },
  },
  fr: {
    nav: { home: 'ACCUEIL', practiceAreas: "DOMAINES D'INTERVENTION", team: 'NOTRE ÉQUIPE', contact: 'CONTACT' },
    topbar: { address: 'Adresse :', phone: 'Téléphone :', email: 'E-mail :' },
    dashboardCta: 'ACCÈS AU TABLEAU DE BORD',
    practiceAreas: { eyebrow: "DOMAINES D'INTERVENTION", heading: "Nos Domaines d'Intervention", cta: 'EN SAVOIR PLUS' },
    team: { eyebrow: 'NOTRE ÉQUIPE', heading: "Notre Équipe d'Experts" },
    blog: { eyebrow: 'BLOG', heading: 'Derniers Articles', readMore: 'Lire la Suite', viewAll: 'Tous les Articles', backToHome: "Retour à l'Accueil", empty: "Aucun article publié pour l'instant." },
    footer: {
      contact: 'Contact',
      location: 'Notre Emplacement',
      mapNotSet: 'Lien de la carte non défini',
      rights: 'Tous Droits Réservés.',
      privacy: 'Politique de Confidentialité',
      disclosure: 'Mentions Légales',
      cookiePolicy: 'Politique de Cookies',
      onlinePayment: 'Paiement en Ligne',
    },
    cookieBanner: {
      message: "Ce site conserve dans votre navigateur uniquement les données techniques strictement nécessaires à son fonctionnement (préférence de langue/thème, brouillon de formulaire) ; nous n'utilisons aucun cookie de suivi ou publicitaire tiers. Votre choix est enregistré ci-dessous — pour plus de détails, consultez la",
      policyLinkLabel: 'Politique de Cookies',
      reject: 'Refuser',
      accept: 'Accepter',
      closeAriaLabel: 'Fermer',
    },
    whatsapp: { ariaLabel: 'Contactez-nous sur WhatsApp', kvkkTooltip: 'Notice de Protection des Données' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nComment puis-je vous aider ?',
      errorServer: '> Erreur : Impossible de joindre le serveur.',
      errorNetwork: '> Erreur : Connexion réseau perdue.',
      errorTimeout: '> Nous ne pouvons pas répondre pour le moment, veuillez réessayer sous peu.',
    },
    consultationForm: {
      fullName: 'Nom et Prénom',
      phone: 'Numéro de Téléphone',
      email: 'Adresse E-mail',
      legalArea: 'Domaine Juridique de la Consultation',
      summaryLabel: 'Bref Résumé de Votre Affaire',
      attachLabel: 'Joindre un document (facultatif, PDF/DOC/image, max 10 Mo)',
      chooseFile: 'Choisissez ou déposez un fichier',
      channelLabel: 'Canal de Consultation Préféré',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'Appel Vocal Chiffré' },
      legalAreas: {
        'bilisim-yz-dijital': 'Informatique, Intelligence Artificielle et Droits Numériques',
        'startup': "Droit des Startups et de l'Entrepreneuriat",
        'uluslararasi-sozlesmeler': 'Contrats Internationaux et Droit Comparé',
        'bilisim-ceza': 'Droit de la Cybercriminalité',
        'sirketler-ticaret': 'Droit des Sociétés, Commercial et des Contrats',
        'aile-miras': 'Disciplines Juridiques Traditionnelles (Famille, Succession, Immobilier)',
      },
      consent1: "Je reconnais que, conformément à la loi sur les avocats n° 1136, le service de consultation en ligne est payant, et que je serai informé(e) du tarif légal applicable lors du processus de confirmation du rendez-vous.",
      consent2: "Je consens explicitement au traitement de mes données personnelles conformément au texte d'information, dans le respect de l'obligation de confidentialité juridique et des normes de la loi turque sur la protection des données (KVKK).",
      disclosureLink: "Texte d'Information",
      submit: 'Envoyer la Demande de Consultation',
      sending: 'Envoi en cours...',
      successTitle: 'Votre Demande a Été Reçue',
      successText: 'Notre cabinet examinera votre demande et vous contactera prochainement pour confirmer votre rendez-vous.',
      errorUnsupportedFile: 'Type de fichier non pris en charge.',
      errorUploadFailed: 'Échec du téléchargement du fichier.',
      errorConsentRequired: 'Vous devez cocher les cases de consentement pour continuer.',
      errorNotConfigured: "Système non configuré : la demande n'a pas pu être envoyée.",
      errorGeneric: "Une erreur s'est produite lors de l'envoi de la demande.",
      imageUploadLabel: 'Téléverser une Image / Photo',
      imageUploadedLabel: 'Image téléversée — cliquez pour modifier',
      imageDropLabel: 'Glissez-déposez ou cliquez pour choisir une image',
      errorInvalidImage: 'Veuillez téléverser un fichier image valide.',
      errorImageUploadFailed: "Une erreur s'est produite lors du téléversement de l'image.",
      consultationAgreementLink: 'Contrat de Consultation',
    },
  },
  de: {
    nav: { home: 'STARTSEITE', practiceAreas: 'RECHTSGEBIETE', team: 'UNSER TEAM', contact: 'KONTAKT' },
    topbar: { address: 'Adresse:', phone: 'Telefon:', email: 'E-Mail:' },
    dashboardCta: 'ZUM DASHBOARD',
    practiceAreas: { eyebrow: 'RECHTSGEBIETE', heading: 'Unsere Rechtsgebiete', cta: 'MEHR ERFAHREN' },
    team: { eyebrow: 'UNSER TEAM', heading: 'Unser Expertenteam' },
    blog: { eyebrow: 'BLOG', heading: 'Neueste Artikel', readMore: 'Weiterlesen', viewAll: 'Alle Artikel', backToHome: 'Zurück zur Startseite', empty: 'Noch keine Artikel veröffentlicht.' },
    footer: {
      contact: 'Kontakt',
      location: 'Unser Standort',
      mapNotSet: 'Kartenlink nicht festgelegt',
      rights: 'Alle Rechte vorbehalten.',
      privacy: 'Datenschutzrichtlinie',
      disclosure: 'Impressum',
      cookiePolicy: 'Cookie-Richtlinie',
      onlinePayment: 'Online-Zahlung',
    },
    cookieBanner: {
      message: 'Diese Website speichert in Ihrem Browser nur technische Daten, die für den Betrieb der Website zwingend erforderlich sind (z. B. Sprach-/Themenpräferenz, Formularentwurf); wir verwenden keine Tracking- oder Werbe-Cookies von Drittanbietern. Ihre Auswahl wird unten gespeichert — Details finden Sie im',
      policyLinkLabel: 'Cookie-Informationstext',
      reject: 'Ablehnen',
      accept: 'Akzeptieren',
      closeAriaLabel: 'Schließen',
    },
    whatsapp: { ariaLabel: 'Kontaktieren Sie uns über WhatsApp', kvkkTooltip: 'Datenschutz-Informationstext' },
    chat: {
      title: 'USTE_HUKUK_TERMINAL',
      greeting: 'Üste Hukuk Terminal v1.0\nWie kann ich Ihnen helfen?',
      errorServer: '> Fehler: Server nicht erreichbar.',
      errorNetwork: '> Fehler: Netzwerkverbindung unterbrochen.',
      errorTimeout: '> Wir können momentan nicht antworten, bitte versuchen Sie es in Kürze erneut.',
    },
    consultationForm: {
      fullName: 'Vor- und Nachname',
      phone: 'Telefonnummer',
      email: 'E-Mail-Adresse',
      legalArea: 'Rechtsgebiet der Beratung',
      summaryLabel: 'Kurze Zusammenfassung Ihres Anliegens',
      attachLabel: 'Dokument anhängen (optional, PDF/DOC/Bild, max. 10MB)',
      chooseFile: 'Datei auswählen oder ablegen',
      channelLabel: 'Bevorzugter Beratungskanal',
      channels: { zoomTeams: 'Zoom / Microsoft Teams', encryptedCall: 'Verschlüsselter Sprachanruf' },
      legalAreas: {
        'bilisim-yz-dijital': 'IT, Künstliche Intelligenz und Digitale Rechte',
        'startup': 'Startup- und Unternehmensrecht',
        'uluslararasi-sozlesmeler': 'Internationale Verträge & Rechtsvergleichung',
        'bilisim-ceza': 'Cyberkriminalitätsrecht',
        'sirketler-ticaret': 'Gesellschafts-, Handels- und Vertragsrecht',
        'aile-miras': 'Traditionelle Rechtsgebiete (Familie, Erbschaft, Immobilien)',
      },
      consent1: 'Ich bestätige, dass die Online-Beratung gemäß dem Rechtsanwaltsgesetz Nr. 1136 kostenpflichtig ist und dass ich während des Terminbestätigungsprozesses über den geltenden gesetzlichen Tarif informiert werde.',
      consent2: 'Ich willige ausdrücklich in die Verarbeitung meiner personenbezogenen Daten gemäß dem Informationstext ein, vorbehaltlich der anwaltlichen Verschwiegenheitspflicht und der Standards des türkischen Datenschutzgesetzes (KVKK).',
      disclosureLink: 'Informationstext',
      submit: 'Beratungsanfrage Senden',
      sending: 'Wird gesendet...',
      successTitle: 'Ihre Anfrage Wurde Empfangen',
      successText: 'Unsere Kanzlei wird Ihre Anfrage prüfen und sich in Kürze mit Ihnen in Verbindung setzen, um Ihren Termin zu bestätigen.',
      errorUnsupportedFile: 'Nicht unterstützter Dateityp.',
      errorUploadFailed: 'Datei-Upload fehlgeschlagen.',
      errorConsentRequired: 'Sie müssen die Einwilligungsfelder ankreuzen, um fortzufahren.',
      errorNotConfigured: 'System nicht konfiguriert: Anfrage konnte nicht gesendet werden.',
      errorGeneric: 'Beim Senden der Anfrage ist ein Fehler aufgetreten.',
      imageUploadLabel: 'Bild / Foto Hochladen',
      imageUploadedLabel: 'Bild hochgeladen — zum Ändern klicken',
      imageDropLabel: 'Bild per Drag & Drop ablegen oder zum Auswählen klicken',
      errorInvalidImage: 'Bitte laden Sie eine gültige Bilddatei hoch.',
      errorImageUploadFailed: 'Beim Hochladen des Bildes ist ein Fehler aufgetreten.',
      consultationAgreementLink: 'Beratungsvertrag',
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionary[locale];
}
