"""
Arabic titles for supplier products.

CJ sends every product in English. The importer used to write that same English
string into both `name` and `name_ar`, so a visitor who switched the store to
Arabic saw the language button work everywhere except on the products
themselves — the field was there, it just never held Arabic.

This module builds a real Arabic title out of the supplier's English one. It is
not machine translation: supplier titles in this trade are not sentences, they
are attribute stacks — "S925 Sterling Silver Butterfly Pendant Necklace for
Women" — drawn from a vocabulary of a few hundred words. So the title is parsed
into the attributes it actually names, and those attributes are composed back in
Arabic word order (noun first, then adjectives, agreeing in gender).

What it will not do is guess. Every Arabic word it emits was matched from a word
the supplier actually wrote; nothing is added for flavour. When the title names
nothing recognisable, `translate_title` returns None and the caller keeps the
English — an honest English title beats an invented Arabic one, and beats a
half-translated mangle by more.
"""
import re
from typing import Dict, List, Optional, Tuple

# ── Product types ────────────────────────────────────────────────────────────
# (Arabic noun, agreement class). "f" also covers the broken plurals — أقراط,
# خواتم and أساور all take feminine-singular adjectives in Arabic, so they need
# no separate class.
#
# Multi-word keys are matched before single-word ones: "stud earrings" is a more
# specific answer than "earrings", and "ear ring" must be read as an earring
# rather than as a ring.
_TYPES: List[Tuple[str, str, str]] = [
    # (english key, arabic, gender)
    ("stud earring", "أقراط ثابتة", "f"),
    ("hoop earring", "أقراط حلقية", "f"),
    ("drop earring", "أقراط متدلّية", "f"),
    ("dangle earring", "أقراط متدلّية", "f"),
    ("huggie earring", "أقراط ملتصقة", "f"),
    ("ear cuff", "سوار أذن", "m"),
    ("ear clip", "أقراط بمشبك", "f"),
    ("ear ring", "أقراط", "f"),
    ("earring", "أقراط", "f"),
    ("earrings", "أقراط", "f"),

    ("pendant necklace", "قلادة بتعليقة", "f"),
    ("choker necklace", "طوق", "m"),
    ("chain necklace", "قلادة بسلسلة", "f"),
    ("necklace", "قلادة", "f"),
    ("choker", "طوق", "m"),
    ("pendant", "تعليقة", "f"),
    ("locket", "مِيدالية", "f"),
    ("body chain", "سلسلة جسم", "f"),
    ("chain", "سلسلة", "f"),

    ("charm bracelet", "سوار بتمائم", "m"),
    ("cuff bracelet", "سوار مفتوح", "m"),
    ("tennis bracelet", "سوار تنس", "m"),
    ("bracelet", "سوار", "m"),
    ("bangle", "إسورة", "f"),
    ("anklet", "خلخال", "m"),
    ("wristband", "سوار معصم", "m"),

    ("engagement ring", "خاتم خطوبة", "m"),
    ("wedding ring", "خاتم زواج", "m"),
    ("nose ring", "خزامة", "f"),
    ("toe ring", "خاتم قدم", "m"),
    ("signet ring", "خاتم منقوش", "m"),
    ("finger ring", "خاتم", "m"),
    ("ring", "خاتم", "m"),
    ("rings", "خواتم", "f"),

    ("wrist watch", "ساعة يد", "f"),
    ("wristwatch", "ساعة يد", "f"),
    ("watch", "ساعة", "f"),

    ("jewelry set", "طقم مجوهرات", "m"),
    ("jewellery set", "طقم مجوهرات", "m"),
    ("necklace set", "طقم قلادة", "m"),
    ("earring set", "طقم أقراط", "m"),

    ("hair clip", "مشبك شعر", "m"),
    ("hair pin", "دبوس شعر", "m"),
    ("hairpin", "دبوس شعر", "m"),
    ("hair band", "عصابة شعر", "f"),
    ("headband", "عصابة رأس", "f"),
    ("hair comb", "مشط شعر", "m"),
    ("hair chain", "سلسلة شعر", "f"),
    ("scrunchie", "ربطة شعر", "f"),
    ("tiara", "تاج", "m"),
    ("crown", "تاج", "m"),

    ("brooch", "بروش", "m"),
    ("pin", "دبوس", "m"),
    ("cufflink", "زر أكمام", "m"),
    ("cuff link", "زر أكمام", "m"),
    ("keychain", "ميدالية مفاتيح", "f"),
    ("key chain", "ميدالية مفاتيح", "f"),
    ("charm", "تميمة", "f"),
]

# ── Materials that read as nouns beside the type ─────────────────────────────
# Arabic puts these in apposition with no preposition: "خاتم فضة", "سوار جلد".
_MATERIAL_NOUNS: List[Tuple[str, str]] = [
    ("sterling silver", "فضة إسترليني 925"),
    ("s925", "فضة إسترليني 925"),
    ("925 silver", "فضة إسترليني 925"),
    ("silver 925", "فضة إسترليني 925"),
    ("stainless steel", "ستانلس ستيل"),
    ("surgical steel", "ستانلس ستيل طبي"),
    ("titanium steel", "ستيل تيتانيوم"),
    ("titanium", "تيتانيوم"),
    ("rose gold", "ذهب وردي"),
    ("white gold", "ذهب أبيض"),
    ("yellow gold", "ذهب أصفر"),
    ("solid gold", "ذهب خالص"),
    ("silver", "فضة"),
    ("platinum", "بلاتين"),
    ("leather", "جلد"),
    ("genuine leather", "جلد طبيعي"),
    ("ceramic", "سيراميك"),
    ("resin", "راتنج"),
    ("acrylic", "أكريليك"),
    ("wood", "خشب"),
    ("copper", "نحاس"),
    ("brass", "نحاس أصفر"),
    ("silicone", "سيليكون"),
    ("velvet", "مخمل"),
    ("satin", "ساتان"),
    ("lace", "دانتيل"),
]

# ── Materials that read as adjectives ────────────────────────────────────────
# (masculine, feminine) — Arabic adjectives agree with their noun.
_MATERIAL_ADJECTIVES: List[Tuple[str, Tuple[str, str]]] = [
    # The coloured platings come first, and are read before the metals table
    # ever runs: "Rose Gold Plated" left as "gold plated" strands the word
    # "rose", which the motif table then read as a flower and printed on a
    # bracelet shaped like a snake.
    ("rose gold plated", ("مطلي بالذهب الوردي", "مطلية بالذهب الوردي")),
    ("white gold plated", ("مطلي بالذهب الأبيض", "مطلية بالذهب الأبيض")),
    ("yellow gold plated", ("مطلي بالذهب الأصفر", "مطلية بالذهب الأصفر")),
    ("18k gold plated", ("مطلي بالذهب عيار 18", "مطلية بالذهب عيار 18")),
    ("14k gold plated", ("مطلي بالذهب عيار 14", "مطلية بالذهب عيار 14")),
    ("24k gold plated", ("مطلي بالذهب عيار 24", "مطلية بالذهب عيار 24")),
    ("gold plated", ("مطلي بالذهب", "مطلية بالذهب")),
    ("gold filled", ("مغلّف بالذهب", "مغلّفة بالذهب")),
    ("silver plated", ("مطلي بالفضة", "مطلية بالفضة")),
    ("rhodium plated", ("مطلي بالروديوم", "مطلية بالروديوم")),
    ("18k", ("عيار 18", "عيار 18")),
    ("14k", ("عيار 14", "عيار 14")),
    ("alloy", ("معدني", "معدنية")),
    ("metal", ("معدني", "معدنية")),
    ("crystal", ("كريستالي", "كريستالية")),
]

# ── Stones ───────────────────────────────────────────────────────────────────
# Emitted as a prepositional phrase — "مرصّع بالزركون" — which does inflect on
# the participle, so the two forms are carried here too.
_STONES: List[Tuple[str, str, str]] = [
    ("cubic zirconia", "الزركون المكعّب", "زركون مكعّب"),
    ("cubic zircon", "الزركون المكعّب", "زركون مكعّب"),
    ("moissanite", "المويسانايت", "مويسانايت"),
    ("zirconia", "الزركون", "زركون"),
    ("zircon", "الزركون", "زركون"),
    ("diamond", "الألماس", "ألماس"),
    ("rhinestone", "الأحجار اللامعة", "أحجار لامعة"),
    ("freshwater pearl", "اللؤلؤ الطبيعي", "لؤلؤ طبيعي"),
    ("pearl", "اللؤلؤ", "لؤلؤ"),
    ("opal", "الأوبال", "أوبال"),
    ("turquoise", "الفيروز", "فيروز"),
    ("amethyst", "الجمشت", "جمشت"),
    ("emerald", "الزمرّد", "زمرّد"),
    ("ruby", "الياقوت الأحمر", "ياقوت أحمر"),
    ("sapphire", "الياقوت الأزرق", "ياقوت أزرق"),
    ("topaz", "التوباز", "توباز"),
    ("garnet", "العقيق الأحمر", "عقيق أحمر"),
    ("agate", "العقيق", "عقيق"),
    ("obsidian", "الأوبسيديان", "أوبسيديان"),
    ("onyx", "الأونيكس", "أونيكس"),
    ("jade", "اليشم", "يشم"),
    ("quartz", "الكوارتز", "كوارتز"),
    ("tourmaline", "التورمالين", "تورمالين"),
    ("aquamarine", "الأكوامارين", "أكوامارين"),
    ("citrine", "السيترين", "سيترين"),
    ("peridot", "الزبرجد", "زبرجد"),
    ("moonstone", "حجر القمر", "حجر القمر"),
    ("gemstone", "الأحجار الكريمة", "أحجار كريمة"),
    ("crystal", "الكريستال", "كريستال"),
    ("enamel", "المينا", "مينا"),
    ("shell", "الصدف", "صدف"),
    ("coral", "المرجان", "مرجان"),
]

# ── Motifs — what the piece is shaped like ───────────────────────────────────
_MOTIFS: List[Tuple[str, str]] = [
    ("tree of life", "شجرة الحياة"),
    ("evil eye", "العين الزرقاء"),
    ("four leaf clover", "البرسيم رباعي الأوراق"),
    ("clover", "البرسيم"),
    ("hamsa", "كف فاطمة"),
    ("butterfly", "فراشة"),
    ("dragonfly", "يعسوب"),
    ("snowflake", "ندفة ثلج"),
    ("teardrop", "دمعة"),
    ("water drop", "قطرة"),
    ("infinity", "اللانهاية"),
    ("heart", "قلب"),
    ("star", "نجمة"),
    ("moon", "هلال"),
    ("sun", "شمس"),
    ("cloud", "سحابة"),
    ("flower", "زهرة"),
    ("rose", "وردة"),
    ("leaf", "ورقة شجر"),
    ("feather", "ريشة"),
    ("snake", "أفعى"),
    ("serpent", "أفعى"),
    ("owl", "بومة"),
    ("cat", "قطة"),
    ("elephant", "فيل"),
    ("lion", "أسد"),
    ("wolf", "ذئب"),
    ("dragon", "تنين"),
    ("bee", "نحلة"),
    ("dolphin", "دلفين"),
    ("horse", "حصان"),
    ("bird", "طائر"),
    ("angel", "ملاك"),
    ("crown", "تاج"),
    ("key", "مفتاح"),
    ("lock", "قفل"),
    ("bow", "فيونكة"),
    ("knot", "عقدة"),
    ("cross", "صليب"),
    ("skull", "جمجمة"),
    ("compass", "بوصلة"),
    ("anchor", "مرساة"),
    ("music note", "نوتة موسيقية"),
    ("initial", "حرف"),
    ("letter", "حرف"),
    ("zodiac", "برج فلكي"),
    ("infinity knot", "عقدة اللانهاية"),
]

# ── Style adjectives ─────────────────────────────────────────────────────────
_STYLES: List[Tuple[str, Tuple[str, str]]] = [
    ("vintage", ("كلاسيكي", "كلاسيكية")),
    ("retro", ("بطراز قديم", "بطراز قديم")),
    ("classic", ("كلاسيكي", "كلاسيكية")),
    ("luxury", ("فاخر", "فاخرة")),
    ("luxurious", ("فاخر", "فاخرة")),
    ("elegant", ("أنيق", "أنيقة")),
    ("exquisite", ("أنيق", "أنيقة")),
    ("minimalist", ("بسيط", "بسيطة")),
    ("simple", ("بسيط", "بسيطة")),
    ("dainty", ("رقيق", "رقيقة")),
    ("delicate", ("رقيق", "رقيقة")),
    ("bohemian", ("بوهيمي", "بوهيمية")),
    ("boho", ("بوهيمي", "بوهيمية")),
    ("gothic", ("قوطي", "قوطية")),
    ("punk", ("بانك", "بانك")),
    ("korean", ("كوري", "كورية")),
    ("japanese", ("ياباني", "يابانية")),
    ("french", ("فرنسي", "فرنسية")),
    ("italian", ("إيطالي", "إيطالية")),
    ("baroque", ("باروكي", "باروكية")),
    ("geometric", ("هندسي", "هندسية")),
    ("statement", ("لافت", "لافتة")),
    ("chunky", ("عريض", "عريضة")),
    ("layered", ("متعدّد الطبقات", "متعدّدة الطبقات")),
    ("multilayer", ("متعدّد الطبقات", "متعدّدة الطبقات")),
    ("adjustable", ("قابل للتعديل", "قابلة للتعديل")),
    ("stackable", ("قابل للتركيب", "قابلة للتركيب")),
    ("handmade", ("يدوي الصنع", "يدوية الصنع")),
    ("engraved", ("منقوش", "منقوشة")),
    ("personalized", ("قابل للتخصيص", "قابلة للتخصيص")),
    ("customized", ("قابل للتخصيص", "قابلة للتخصيص")),
    ("waterproof", ("مقاوم للماء", "مقاومة للماء")),
    ("hypoallergenic", ("لا يسبّب الحساسية", "لا تسبّب الحساسية")),
    ("twisted", ("ملتوٍ", "ملتوية")),
    ("braided", ("مضفور", "مضفورة")),
    ("beaded", ("بخرزات", "بخرزات")),
    ("open", ("مفتوح", "مفتوحة")),
    ("hollow", ("مفرّغ", "مفرّغة")),
    ("matte", ("مطفي", "مطفية")),
    ("shiny", ("لامع", "لامعة")),
    ("shining", ("لامع", "لامعة")),
    ("sparkling", ("لامع", "لامعة")),
    ("brilliant", ("لامع", "لامعة")),
    ("glitter", ("لامع", "لامعة")),
]

# ── Occasion, worn as a purpose phrase ───────────────────────────────────────
_OCCASIONS: List[Tuple[str, str, str]] = [
    ("bridal", "للعرائس", "العرائس"),
    ("bride", "للعرائس", "العرائس"),
    ("wedding", "للأعراس", "الأعراس"),
    ("engagement", "للخطوبة", "الخطوبة"),
    ("anniversary", "للذكرى السنوية", "الذكرى السنوية"),
    ("valentine", "لعيد الحب", "عيد الحب"),
    ("birthday", "لأعياد الميلاد", "أعياد الميلاد"),
    ("party", "للحفلات", "الحفلات"),
    ("prom", "للحفلات", "الحفلات"),
    ("everyday", "للاستخدام اليومي", "الاستخدام اليومي"),
    ("daily", "للاستخدام اليومي", "الاستخدام اليومي"),
]

# ── Audience ─────────────────────────────────────────────────────────────────
# Ordered so the compound readings win: "for women and men" is unisex, and a
# lone "men" must not be found inside "women".
_AUDIENCES: List[Tuple[str, str]] = [
    ("unisex", "للجنسين"),
    ("women and men", "للجنسين"),
    ("men and women", "للجنسين"),
    ("couple", "للأزواج"),
    ("women", "للنساء"),
    ("woman", "للنساء"),
    ("womens", "للنساء"),
    ("ladies", "للنساء"),
    ("lady", "للنساء"),
    ("female", "للنساء"),
    ("girls", "للفتيات"),
    ("girl", "للفتيات"),
    ("men", "للرجال"),
    ("man", "للرجال"),
    ("mens", "للرجال"),
    ("male", "للرجال"),
    ("boys", "للأولاد"),
    ("kids", "للأطفال"),
    ("children", "للأطفال"),
    ("baby", "للأطفال"),
]

# How many words the composed title may run to before it stops being a heading.
_MAX_WORDS = 12


def _normalise(text: str) -> str:
    """
    Lowercase, and pad with spaces so every lookup can demand word boundaries.

    The boundaries are the point: without them "ring" matches inside "earring"
    and every pair of earrings in the shop becomes a خاتم.
    """
    low = re.sub(r"[^a-z0-9]+", " ", (text or "").lower())
    return f" {re.sub(r'  +', ' ', low).strip()} "


def _by_length(table: List) -> List:
    """
    Longest key first, always.

    Every table here contains keys that contain each other — "cubic zirconia"
    and "zircon", "rose gold" and "gold", "women and men" and "men". Sorting
    instead of hand-ordering means adding a word to a table can never quietly
    put a shorter key ahead of the compound it belongs to.
    """
    return sorted(table, key=lambda entry: -len(entry[0]))


def _spans(haystack: str, key: str) -> Optional[str]:
    """
    The form of `key` present in `haystack` as whole words, singular or plural.

    Supplier titles say "Stud Earrings" and "Drop Earrings", never the
    singular, so a table keyed on "stud earring" matched none of them and every
    pair fell back to the bare "أقراط".
    """
    for candidate in (key, f"{key}s", f"{key}es"):
        if f" {candidate} " in haystack:
            return candidate
    return None


class _Reader:
    """
    One pass over a title, where matching consumes what it matched.

    Consumption has to span tables, not just live inside one: "Rose Gold Snake
    Bangle" names a rose-gold bangle, and reading it with a per-table haystack
    matched "rose gold" as the metal *and* "rose" again as the motif, so the
    shop offered a snake bracelet decorated with a flower it does not have.
    """

    def __init__(self, text: str):
        self.remaining = _normalise(text)

    def take(self, table: List) -> List:
        found = []
        for entry in _by_length(table):
            present = _spans(self.remaining, entry[0])
            if present:
                found.append(entry)
                self.remaining = self.remaining.replace(f" {present} ", " ")
        return found

    def take_head(self, table: List) -> Optional[Tuple[str, str]]:
        """
        The product type, read as English reads it: the head noun is the last.

        "Butterfly Pendant Necklace" is a necklace; "Necklace Pendant" is a
        pendant. Compared on where each candidate *ends*, not where it starts —
        "stud earrings" and "earrings" end on the same word, and ranking them
        by start position handed every pair to the vaguer of the two, so the
        shop listed أقراط where the supplier had said أقراط ثابتة. Ending
        together means the longer key is the more specific reading, and
        `_by_length` has already put it first.
        """
        best = None
        for entry in _by_length(table):
            present = _spans(self.remaining, entry[0])
            if not present:
                continue
            position = self.remaining.rindex(f" {present} ") + len(present)
            if best is None or position > best[0]:
                best = (position, present, entry)
        if not best:
            return None
        _, present, (_, arabic, gender) = best
        self.remaining = self.remaining.replace(f" {present} ", " ")
        return arabic, gender


def _agree(pair: Tuple[str, str], gender: str) -> str:
    return pair[1] if gender == "f" else pair[0]


def _dedupe(words: List[str]) -> List[str]:
    seen, out = set(), []
    for word in words:
        if word and word not in seen:
            seen.add(word)
            out.append(word)
    return out


def analyse(english_title: str) -> Dict:
    """
    Read a supplier title into the attributes it actually names.

    Returned as plain data so both the title and the description can be built
    from one pass, and so a test can assert on what was understood rather than
    only on the sentence that came out.
    """
    reader = _Reader(english_title)

    head = reader.take_head(_TYPES)
    arabic_type, gender = head if head else (None, "m")

    # Order matters, because reading consumes: materials before motifs, so
    # "Rose Gold" is spent on the metal and cannot be read again as a rose;
    # stones before styles, so "Crystal" is a stone rather than the adjective
    # of the same name.
    material_adjectives = [_agree(pair, gender) for _, pair in reader.take(_MATERIAL_ADJECTIVES)]
    material_nouns = [ar for _, ar in reader.take(_MATERIAL_NOUNS)]
    stones = [(definite, bare) for _, definite, bare in reader.take(_STONES)]
    motifs = [ar for _, ar in reader.take(_MOTIFS)]
    styles = [_agree(pair, gender) for _, pair in reader.take(_STYLES)]
    occasions = [(phrase, bare) for _, phrase, bare in reader.take(_OCCASIONS)]
    audiences = [ar for _, ar in reader.take(_AUDIENCES)]

    return {
        "type": arabic_type,
        "gender": gender,
        "material_nouns": material_nouns,
        "material_adjectives": material_adjectives,
        "styles": styles,
        "motifs": motifs,
        "stones": [definite for definite, _ in stones],
        "stones_bare": [bare for _, bare in stones],
        "occasions": [phrase for phrase, _ in occasions],
        "occasions_bare": [bare for _, bare in occasions],
        "audiences": audiences,
    }


def translate_title(english_title: str) -> Optional[str]:
    """
    An Arabic heading for a supplier product, or None when there isn't one.

    Composed in Arabic order — the noun leads, its adjectives follow and agree
    with it, and the prepositional phrases come last:

        "S925 Sterling Silver Butterfly Pendant Necklace for Women"
        → "قلادة بتعليقة فضة إسترليني 925 بتصميم فراشة للنساء"

    None means the title named no product type we know, or named a type and
    nothing else. Both cases are left in English on purpose: a catalogue where
    every second row reads "خاتم" and nothing more is worse than one that reads
    in English, and it hides which products still need a human's attention.
    """
    facts = analyse(english_title)
    if not facts["type"]:
        return None

    parts: List[str] = [facts["type"]]
    parts += _dedupe(facts["material_nouns"])[:1]
    parts += _dedupe(facts["material_adjectives"])[:1]
    parts += _dedupe(facts["styles"])[:2]

    for motif in _dedupe(facts["motifs"])[:1]:
        parts.append(f"بتصميم {motif}")

    for stone in _dedupe(facts["stones"])[:1]:
        # "ب" fuses straight onto the article — بالزركون, never بـالزركون.
        parts.append(("مرصّعة" if facts["gender"] == "f" else "مرصّع") + f" ب{stone}")

    parts += _dedupe(facts["occasions"])[:1]
    parts += _dedupe(facts["audiences"])[:1]

    # A type on its own is not a name — it is the category, which the product
    # already carries in its own field.
    if len(parts) < 2:
        return None

    title = " ".join(_dedupe(parts))
    words = title.split(" ")
    if len(words) > _MAX_WORDS:
        title = " ".join(words[:_MAX_WORDS])
    return title.strip()


def translate_description(english_title: str, english_description: str = "") -> Optional[str]:
    """
    An Arabic description built from the attributes the supplier stated.

    Deliberately not a translation of CJ's prose — that prose is keyword
    padding written for a search engine, and in most of this catalogue it is
    literally a copy of the title. What a shopper reading Arabic wants is the
    specification, so that is what this returns, and only the lines we can
    actually fill:

        "الخامة: فضة إسترليني 925 · التصميم: فراشة · الفئة: للنساء"

    None when fewer than two facts were recognised — at that point a "spec
    sheet" would say less than the English text it replaced.
    """
    facts = analyse(f"{english_title} {english_description}")

    lines: List[str] = []
    if facts["type"]:
        lines.append(f"النوع: {facts['type']}")

    materials = _dedupe(facts["material_nouns"] + facts["material_adjectives"])
    if materials:
        lines.append("الخامة: " + "، ".join(materials[:3]))

    stones = _dedupe(facts["stones_bare"])
    if stones:
        # The indefinite form: the article belongs to the prepositional phrase
        # ("مرصّع بالزركون"), not after a label that already reads "الحجر:".
        lines.append("الحجر: " + "، ".join(stones[:3]))

    motifs = _dedupe(facts["motifs"])
    if motifs:
        lines.append("التصميم: " + "، ".join(motifs[:3]))

    styles = _dedupe(facts["styles"])
    if styles:
        lines.append("الطراز: " + "، ".join(styles[:3]))

    occasions = _dedupe(facts["occasions_bare"])
    if occasions:
        lines.append("المناسبة: " + "، ".join(occasions[:2]))

    audiences = _dedupe(facts["audiences"])
    if audiences:
        lines.append("الفئة: " + audiences[0])

    if len(lines) < 2:
        return None
    return " · ".join(lines)


def looks_untranslated(arabic_value: Optional[str]) -> bool:
    """
    True when a field claiming to be Arabic holds no Arabic at all.

    This is what the whole catalogue looks like before the backfill runs: the
    field exists, it is populated, and every character in it is English. A plain
    "is it empty" check reports those products as already done.
    """
    if not arabic_value or not str(arabic_value).strip():
        return True
    return not re.search(r"[؀-ۿ]", str(arabic_value))
