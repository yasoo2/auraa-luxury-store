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

The same reading also composes the *English* specification, and that is not
symmetry for its own sake. iyzico refused this shop's application with, among
other things: «Ürünlerinizin materyallerini (altın, gümüş, çelik vb. gibi)
ürün açıklamalarınızda belirtmenizi rica ederiz» — state your products'
materials in your product descriptions. The Arabic description had been stating
them since the day it was written; the English one, which is what a Turkish
reviewer reads, carried CJ's keyword padding and named no material at all.
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
    # «فضة إسترليني 925» stays a claim about substance, and it is the one
    # precious metal here that survives the price test: 925 is a hallmark the
    # supplier states specifically, and a small silver piece genuinely costs a
    # few dollars wholesale. Bare "Silver" does not survive it — in a CJ title
    # it means the colour — and it has moved to the colours below.
    ("sterling silver", "فضة إسترليني 925"),
    ("s925", "فضة إسترليني 925"),
    ("925 silver", "فضة إسترليني 925"),
    ("silver 925", "فضة إسترليني 925"),
    ("925 sterling", "فضة إسترليني 925"),
    ("stainless steel", "ستانلس ستيل"),
    ("surgical steel", "ستانلس ستيل طبي"),
    ("titanium steel", "ستيل تيتانيوم"),
    ("titanium", "تيتانيوم"),
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
    # Added because a product page that names no material at all is the thing
    # iyzico refused the shop over, and these are the words CJ uses for the
    # rest of the catalogue. "steel" on its own sits below the compounds —
    # `_by_length` guarantees "stainless steel" is read first — so it catches
    # only the titles that say nothing more precise.
    ("zinc alloy", "سبيكة زنك"),
    ("zinc", "زنك"),
    ("steel", "ستيل"),
    ("tungsten", "تنجستن"),
    ("bronze", "برونز"),
    ("pu leather", "جلد صناعي"),
    ("faux leather", "جلد صناعي"),
    ("glass", "زجاج"),
    ("plastic", "بلاستيك"),
    ("fabric", "قماش"),
    ("cotton", "قطن"),
    ("nylon", "نايلون"),
    ("rubber", "مطاط"),
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
    ("gold plating", ("مطلي بالذهب", "مطلية بالذهب")),
    ("gold filled", ("مغلّف بالذهب", "مغلّفة بالذهب")),
    ("silver plated", ("مطلي بالفضة", "مطلية بالفضة")),
    ("rhodium plated", ("مطلي بالروديوم", "مطلية بالروديوم")),
    ("platinum plated", ("مطلي بالبلاتين", "مطلية بالبلاتين")),
    # "Gold Color" is a claim about the colour, not about the metal, and it has
    # to be read as one. Left out, "Rose Gold Color Bracelet" spent "rose gold"
    # on the metals table above and sold a plated bracelet as solid rose gold;
    # matched as a bare "gold color", it stranded the word "rose" for the motif
    # table to find and printed a flower that is not on the piece. Each colour
    # phrase is therefore carried whole.
    ("rose gold color", ("بلون الذهب الوردي", "بلون الذهب الوردي")),
    ("rose gold tone", ("بلون الذهب الوردي", "بلون الذهب الوردي")),
    ("white gold color", ("بلون الذهب الأبيض", "بلون الذهب الأبيض")),
    ("gold color", ("بلون الذهب", "بلون الذهب")),
    ("gold tone", ("بلون الذهب", "بلون الذهب")),
    ("silver color", ("بلون الفضة", "بلون الفضة")),
    ("silver tone", ("بلون الفضة", "بلون الفضة")),
    # The unqualified precious metals, read as the colour they are.
    #
    # These sat in the table above as claims about substance — "Rose Gold"
    # became «ذهب وردي», solid rose gold, on a bracelet the shop sells for
    # twenty-six dollars and the supplier for three. Same word, same fault, as
    # the diamond the composer no longer names.
    #
    # Colour rather than silence, which is where the stones went, because the
    # readings are not alike: a metal's name maps onto a colour a customer can
    # check against the photograph, and «بلون الذهب» claims nothing about what
    # is under it. "Diamond" has no such reading — there is no colour called
    # diamond — so there the shop says nothing at all.
    ("rose gold", ("بلون الذهب الوردي", "بلون الذهب الوردي")),
    ("white gold", ("بلون الذهب الأبيض", "بلون الذهب الأبيض")),
    ("yellow gold", ("بلون الذهب الأصفر", "بلون الذهب الأصفر")),
    ("solid gold", ("بلون الذهب", "بلون الذهب")),
    ("platinum", ("بلون البلاتين", "بلون البلاتين")),
    ("silver", ("بلون الفضة", "بلون الفضة")),
    # "18K" with no "plated" after it is a purity claim on a piece that has no
    # purity. Read and dropped, like the stones: the compounds above still
    # catch "18K Gold Plated", which is the true and common case.
    ("18k", ("", "")),
    ("14k", ("", "")),
    ("24k", ("", "")),
    ("alloy", ("معدني", "معدنية")),
    ("metal", ("معدني", "معدنية")),
    ("crystal", ("كريستالي", "كريستالية")),
]

# Both material tables, read as one.
#
# They used to be read one after the other, adjectives first, and that order
# was load-bearing: "Rose Gold Plated" had to reach the adjectives before the
# nouns could match "rose gold" inside it and sell a plated bracelet as solid
# gold. But an order that protects one compound breaks another — "Zinc Alloy"
# lost "alloy" to the adjective pass and printed "Material: Zinc, Alloy", two
# halves of one word. Read together and sorted by length, every compound beats
# every part of itself whichever table it lives in, and neither table has to
# know the other exists.
_MATERIALS: List[Tuple[str, object, str]] = (
    [(key, arabic, "noun") for key, arabic in _MATERIAL_NOUNS]
    + [(key, pair, "adj") for key, pair in _MATERIAL_ADJECTIVES]
)

# ── Stones the shop is willing to name ───────────────────────────────────────
# Emitted as a prepositional phrase — "مرصّع بالزركون" — which does inflect on
# the participle, so the two forms are carried here too.
#
# Every entry here names a stone that is man-made or costume *by definition*.
# Cubic zirconia is grown in a furnace; a rhinestone is glass; moissanite is
# lab silicon carbide. Repeating the supplier's word for one of these cannot
# overstate what the customer will receive.
_STONES: List[Tuple[str, str, str]] = [
    ("cubic zirconia", "الزركون المكعّب", "زركون مكعّب"),
    ("cubic zircon", "الزركون المكعّب", "زركون مكعّب"),
    ("moissanite", "المويسانايت", "مويسانايت"),
    ("zirconia", "الزركون", "زركون"),
    ("zircon", "الزركون", "زركون"),
    ("rhinestone", "الأحجار اللامعة", "أحجار لامعة"),
    ("crystal", "الكريستال", "كريستال"),
    ("enamel", "المينا", "مينا"),
]

# ── Stones the shop refuses to name ──────────────────────────────────────────
#
# This list is the correction of a real deception that reached real customers.
#
# The shop offered «خاتم لامع فاخر مرصّع بالألماس» — a luxury ring set with
# diamonds — for 54 dollars, and under it, on a line of its own, «الخامة:
# الماس». And a heart ring «مرصّع باللؤلؤ» for 37. Neither is possible: the
# supplier's cost on those pieces is a few dollars, and no diamond and no pearl
# exists at that price. The stones are glass and resin, and the shop was
# telling a buyer otherwise, in writing, at the moment of purchase.
#
# The words came from CJ's own titles, where "diamond" and "pearl" are how the
# trade writes "sparkly" and "white bead". They are marketing, not disclosure —
# and a shop that repeats them is not quoting a supplier, it is making the
# claim itself to its own customer.
#
# So these are read — they must be, or the word falls through and the motif
# table prints a shape that is not there — and then dropped. Nothing is emitted
# in either language. Not «ألماس», which would be a lie, and not «ألماس صناعي»
# either, which would be a different unverified claim dressed as caution: the
# supplier's data does not say what the stone is, and neither, therefore, does
# this shop. The product page shows no stone, the owner sees it in the admin
# list of products stating no material, and he can write the truth there once
# he has held one in his hand.
_UNNAMEABLE_STONES: List[Tuple[str, str, str]] = [
    ("freshwater pearl", "", ""),
    ("diamond", "", ""),
    ("pearl", "", ""),
    ("opal", "", ""),
    ("turquoise", "", ""),
    ("amethyst", "", ""),
    ("emerald", "", ""),
    ("ruby", "", ""),
    ("sapphire", "", ""),
    ("topaz", "", ""),
    ("garnet", "", ""),
    ("agate", "", ""),
    ("obsidian", "", ""),
    ("onyx", "", ""),
    ("jade", "", ""),
    ("quartz", "", ""),
    ("tourmaline", "", ""),
    ("aquamarine", "", ""),
    ("citrine", "", ""),
    ("peridot", "", ""),
    ("moonstone", "", ""),
    ("gemstone", "", ""),
    ("shell", "", ""),
    ("coral", "", ""),
]

# The claim words, as they appear in a supplier's English title. The shop must
# not republish these either: the English name shown to an English visitor is
# CJ's own sentence, and «Luxury Shiny Diamond Zircon Ring» printed on this
# storefront is this shop's claim, whoever first wrote it.
_UNNAMEABLE_KEYS = frozenset(key for key, _, _ in _UNNAMEABLE_STONES)

# ── Motifs — what the piece is shaped like ───────────────────────────────────
_MOTIFS: List[Tuple[str, str]] = [
    # "Lace" sat in the materials table until the material was given a line of
    # its own on the product page, and then it read aloud: "Women Vintage Lace
    # Halo Cubic Zirconia Ring — Material: lace". The ring is zirconia; lace is
    # the pattern cut into it. The word is genuinely both in this trade — a
    # lace choker is fabric — and when the title cannot say which, the shop
    # must not assert the one that would be a false claim about what it sells.
    ("lace", "دانتيل"),
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

# Words that praise the product without describing it.
#
# The shop listed a rope-chain bracelet as «سوار فاخر» — luxury bracelet — and
# nothing else, because a type plus one adjective clears the "more than a bare
# type" bar. But it does not clear it in the sense the bar was for: the name
# tells a shopper the category he already clicked and an opinion the seller
# holds of his own goods. A composed name has to contain at least one fact.
_PUFFERY = frozenset({
    "فاخر", "فاخرة", "أنيق", "أنيقة", "لامع", "لامعة", "رقيق", "رقيقة",
    "بسيط", "بسيطة", "لافت", "لافتة",
})


def _normalise(text: str) -> str:
    """
    Lowercase, and pad with spaces so every lookup can demand word boundaries.

    The boundaries are the point: without them "ring" matches inside "earring"
    and every pair of earrings in the shop becomes a خاتم.
    """
    low = re.sub(r"[^a-z0-9]+", " ", (text or "").lower())
    # CJ writes both spellings, and a table cannot hold two of every colour
    # phrase without one of them quietly falling out of step with the other.
    low = re.sub(r"\bcolours?\b", "color", low)
    low = re.sub(r"\bcolors\b", "color", low)
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

    def take(self, table: List) -> List[Tuple[Tuple, str]]:
        """
        Every entry the text names, paired with the words that named it.

        The words come back because the English side is built from them: the
        supplier's own "Stainless Steel" is what an English-reading customer —
        and the reviewer who asked to see materials — should be shown, rather
        than a second English vocabulary maintained beside the Arabic one and
        free to drift away from it.
        """
        found = []
        for entry in _by_length(table):
            present = _spans(self.remaining, entry[0])
            if present:
                found.append((entry, present))
                self.remaining = self.remaining.replace(f" {present} ", " ")
        return found

    def take_head(self, table: List) -> Optional[Tuple[Tuple, str]]:
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
        _, present, entry = best
        self.remaining = self.remaining.replace(f" {present} ", " ")
        return entry, present


def _agree(pair: Tuple[str, str], gender: str) -> str:
    return pair[1] if gender == "f" else pair[0]


def _dedupe(words: List[str]) -> List[str]:
    seen, out = set(), []
    for word in words:
        if word and word not in seen:
            seen.add(word)
            out.append(word)
    return out


# ── English display ──────────────────────────────────────────────────────────
# The supplier's own word, capitalised, is the English display for almost
# everything: "stainless steel" → "Stainless steel", "butterfly" → "Butterfly".
# Listed here are only the keys whose own text is not a thing to show a
# customer — the abbreviations, and the spellings that are two names for one
# material and must not print as two.
_ENGLISH_OVERRIDES: Dict[str, str] = {
    "s925": "Sterling silver 925",
    "925 silver": "Sterling silver 925",
    "silver 925": "Sterling silver 925",
    "sterling silver": "Sterling silver 925",
    "18k": "18K",
    "14k": "14K",
    "24k": "24K",
    "18k gold plated": "18K gold plated",
    "14k gold plated": "14K gold plated",
    "24k gold plated": "24K gold plated",
    "gold color": "Gold-tone",
    "gold tone": "Gold-tone",
    "rose gold color": "Rose gold-tone",
    "rose gold tone": "Rose gold-tone",
    "white gold color": "White gold-tone",
    "silver color": "Silver-tone",
    "silver tone": "Silver-tone",
    # The unqualified metals, in English as in Arabic. Without these the two
    # languages disagreed on the same product — «بلون الذهب الوردي» beside
    # "Rose gold" — and the English half was the claim the Arabic had just
    # stopped making.
    "rose gold": "Rose gold-tone",
    "white gold": "White gold-tone",
    "yellow gold": "Yellow gold-tone",
    "solid gold": "Gold-tone",
    "platinum": "Platinum-tone",
    "silver": "Silver-tone",
    "gold plating": "Gold plated",
    "pu leather": "PU leather",
    "cubic zircon": "Cubic zirconia",
    "zinc alloy": "Zinc alloy",
}

# Audiences are canonicalised in Arabic — "womens", "ladies" and "female" are
# one value — so the English is keyed on that canonical rather than on the word
# matched. Read from the span instead, "Women's Ladies Necklace" printed
# "Womens, Ladies" in English beside a single للنساء in Arabic.
_AUDIENCE_EN: Dict[str, str] = {
    "للجنسين": "Unisex",
    "للأزواج": "Couples",
    "للنساء": "Women",
    "للفتيات": "Girls",
    "للرجال": "Men",
    "للأولاد": "Boys",
    "للأطفال": "Kids",
}


def _english(key: str, span: str) -> str:
    """The supplier's own word, made presentable — never a second vocabulary."""
    if key in _ENGLISH_OVERRIDES:
        return _ENGLISH_OVERRIDES[key]
    return span[:1].upper() + span[1:]


def analyse(english_title: str) -> Dict:
    """
    Read a supplier title into the attributes it actually names.

    Returned as plain data so both the title and the description can be built
    from one pass, and so a test can assert on what was understood rather than
    only on the sentence that came out.
    """
    reader = _Reader(english_title)

    head = reader.take_head(_TYPES)
    if head:
        (type_key, arabic_type, gender), type_span = head
    else:
        (type_key, arabic_type, gender), type_span = (None, None, "m"), None

    # Order matters, because reading consumes: materials before motifs, so
    # "Rose Gold" is spent on the metal and cannot be read again as a rose;
    # stones before styles, so "Crystal" is a stone rather than the adjective
    # of the same name.
    # Read, then filtered: a material with no Arabic behind it is one the shop
    # refuses to name — "18K" with no "plated" after it — and it is here so it
    # gets consumed rather than left for another table to misread.
    material_hits = reader.take(_MATERIALS)
    noun_hits = [(entry, span) for entry, span in material_hits
                 if entry[2] == "noun" and entry[1]]
    adjective_hits = [(entry, span) for entry, span in material_hits
                      if entry[2] == "adj" and entry[1][0]]
    # Both stone tables are read, and only the nameable half survives. Reading
    # the other half matters as much as dropping it: leave "Pearl" unconsumed
    # and the styles table finds nothing but the motif table is still hunting,
    # and a word we refused to print as a stone comes back as a shape.
    stone_hits = [(entry, span) for entry, span
                  in reader.take(_STONES + _UNNAMEABLE_STONES) if entry[1]]
    motif_hits = reader.take(_MOTIFS)
    style_hits = reader.take(_STYLES)
    occasion_hits = reader.take(_OCCASIONS)
    audience_hits = reader.take(_AUDIENCES)

    audiences = _dedupe([entry[1] for entry, _ in audience_hits])

    return {
        "type": arabic_type,
        "gender": gender,
        "material_nouns": [entry[1] for entry, _ in noun_hits],
        "material_adjectives": [_agree(entry[1], gender) for entry, _ in adjective_hits],
        "styles": [_agree(entry[1], gender) for entry, _ in style_hits],
        "motifs": [entry[1] for entry, _ in motif_hits],
        "stones": [entry[1] for entry, _ in stone_hits],
        "stones_bare": [entry[2] for entry, _ in stone_hits],
        "occasions": [entry[1] for entry, _ in occasion_hits],
        "occasions_bare": [entry[2] for entry, _ in occasion_hits],
        "audiences": audiences,
        # The same reading in English. Nouns lead the materials so the metal
        # comes before the plating, which is the order the Arabic prints too.
        "type_en": _english(type_key, type_span) if type_span else None,
        "materials_en": _dedupe(
            [_english(entry[0], span) for entry, span in noun_hits + adjective_hits]),
        "stones_en": _dedupe([_english(entry[0], span) for entry, span in stone_hits]),
        "motifs_en": _dedupe([_english(entry[0], span) for entry, span in motif_hits]),
        "styles_en": _dedupe([_english(entry[0], span) for entry, span in style_hits]),
        "occasions_en": _dedupe([_english(entry[0], span) for entry, span in occasion_hits]),
        "audiences_en": _dedupe([_AUDIENCE_EN.get(ar, "") for ar in audiences]),
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

    # Everything the name says beyond the category and the seller's opinion of
    # his own goods. A title built from these and nothing else is not a name.
    substantive = (
        _dedupe(facts["material_nouns"])[:1]
        + _dedupe(facts["material_adjectives"])[:1]
        + _dedupe(facts["motifs"])[:1]
        + _dedupe(facts["stones"])[:1]
        + [s for s in _dedupe(facts["styles"]) if s not in _PUFFERY]
        + _dedupe(facts["occasions"])[:1]
    )
    if not substantive:
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


def describe_in_english(english_title: str, english_description: str = "") -> Optional[str]:
    """
    The same specification, in English — the half of the shop that had none.

    CJ's own English text is what the storefront fell back to, and it is
    keyword padding: on most of this catalogue it is the title again, and on
    none of it does it say what the piece is made of. That is the sentence
    iyzico asked for and could not find.

    Built from the same reading as the Arabic, so the two cannot disagree — a
    product whose Arabic says فضة إسترليني 925 and whose English says nothing
    is exactly the state this repairs. None when fewer than two facts were
    recognised, and then the caller keeps whatever the supplier wrote.
    """
    facts = analyse(f"{english_title} {english_description}")

    lines: List[str] = []
    if facts["type_en"]:
        lines.append(f"Type: {facts['type_en']}")
    if facts["materials_en"]:
        lines.append("Material: " + ", ".join(facts["materials_en"][:3]))
    if facts["stones_en"]:
        lines.append("Stone: " + ", ".join(facts["stones_en"][:3]))
    if facts["motifs_en"]:
        lines.append("Design: " + ", ".join(facts["motifs_en"][:3]))
    if facts["styles_en"]:
        lines.append("Style: " + ", ".join(facts["styles_en"][:3]))
    if facts["occasions_en"]:
        lines.append("Occasion: " + ", ".join(facts["occasions_en"][:2]))
    if facts["audiences_en"]:
        lines.append("For: " + facts["audiences_en"][0])

    if len(lines) < 2:
        return None
    return " · ".join(lines)


def material_of(english_title: str, english_description: str = "") -> Optional[Dict[str, str]]:
    """
    What the piece is made of, in both languages, or None when nobody said.

    Kept as its own field rather than left inside the description, because a
    material buried mid-sentence is a material a reviewer has to hunt for and a
    customer never reads. The product page gives it a line of its own.

    A stone counts as the material when no metal was named — a freshwater-pearl
    necklace is made of pearl, and printing "—" beside it while the title says
    "Pearl" would be the shop failing to read its own words. What it will not
    do is fill the gap: a title naming no material returns None, the row does
    not appear, and the product shows up in the admin's list of pieces that
    still need one.
    """
    facts = analyse(f"{english_title} {english_description}")

    arabic = _dedupe(facts["material_nouns"] + facts["material_adjectives"])[:3]
    english = facts["materials_en"][:3]
    if not arabic:
        arabic = _dedupe(facts["stones_bare"])[:3]
        english = facts["stones_en"][:3]

    if not arabic or not english:
        return None
    return {"ar": "، ".join(arabic), "en": ", ".join(english)}


# The Arabic the shop used to print for the words it now refuses. Needed to
# find the damage already sitting in the database — a product whose name says
# «مرصّع بالألماس» cannot be found by re-reading its English title, because the
# fix changes what that reading produces, not what was stored years ago.
_UNNAMEABLE_ARABIC_WORDS = (
    "ألماس", "الماس", "ماس", "لؤلؤ", "لؤلؤة", "زمرّد", "زمرد", "ياقوت", "جمشت",
    "أوبال", "اوبال", "فيروز", "توباز", "عقيق", "يشم", "كوارتز", "تورمالين",
    "أكوامارين", "سيترين", "زبرجد", "أوبسيديان", "أونيكس", "مرجان", "صدف",
)
_UNNAMEABLE_ARABIC_PHRASES = ("حجر القمر", "أحجار كريمة", "الأحجار الكريمة")

# Arabic has no word boundary a regex `\b` can see, and the two places this has
# to match are exactly the two it would miss: «بالألماس» carries the preposition
# and the article fused onto the front, and «الماس» is the same word spelled
# without its hamza — which is how it was printed on the page the owner
# photographed. Meanwhile a bare substring search for «ماس» finds it inside
# «حماس» and «الماسية». So: any non-Arabic character in front, then optionally
# one of the single-letter proclitics, then optionally the article, then the
# word, and no Arabic letter after it.
#
# "Letter" here means letters only, not the whole Arabic block. Written as the
# block, the class swallowed the Arabic comma — so «الخامة: الماس، زركون», the
# exact line the owner photographed, read as «الماس» followed by an Arabic
# character and was declared clean.
_ARABIC_LETTER = r"ء-يٱ-ۓ"
_UNNAMEABLE_ARABIC_RE = re.compile(
    rf"(?:^|[^{_ARABIC_LETTER}])[بوفلك]?(?:ال)?"
    rf"(?:{'|'.join(_UNNAMEABLE_ARABIC_WORDS)})(?![{_ARABIC_LETTER}])"
)


# The retired metal claims, as they were written into the database.
#
# Harder to find than the stones, because the honest replacement contains the
# same letters: «بلون الذهب الوردي» has «الذهب الوردي» inside it, «فضة إسترليني
# 925» starts with «فضة», and «مطلي بالذهب عيار 18» ends with «عيار 18». Each
# pattern therefore says what must NOT be around the word — the article, the
# hallmark, the plating — so the correction finds the lie and leaves the truth
# beside it alone.
_RETIRED_METAL_RE = re.compile(
    r"ذهب\s+(?:وردي|أبيض|أصفر|خالص)"      # «سوار ذهب وردي» — solid, not plated
    r"|(?<!ال)بلاتين"                      # bare platinum, but not «بلون البلاتين»
    r"|(?<!ال)فضة(?!\s+إسترليني)"          # bare silver, but not the 925 hallmark
    r"|(?<!بالذهب\s)عيار\s*\d"             # a karat with no metal in front of it
)


def states_retired_metal(*values: Optional[str]) -> bool:
    """True when a string claims a precious metal this shop cannot vouch for."""
    return any(value and _RETIRED_METAL_RE.search(str(value)) for value in values)


def states_unnameable_stone(*values: Optional[str]) -> bool:
    """
    True when any of these strings claims a stone this shop will not vouch for.

    Used to find what is already published rather than what would be composed
    today: the catalogue is full of names this module wrote before it knew
    better, and re-running the composer on them would produce clean text while
    the old text sat untouched in the database, on sale.
    """
    for value in values:
        if not value:
            continue
        text = str(value)
        if any(phrase in text for phrase in _UNNAMEABLE_ARABIC_PHRASES):
            return True
        if _UNNAMEABLE_ARABIC_RE.search(text):
            return True
        if any(f" {key} " in _normalise(text) for key in _UNNAMEABLE_KEYS):
            return True
    return False


def sanitise_supplier_text(text: Optional[str]) -> str:
    """
    A supplier's sentence with the claims this shop will not make removed.

    The English name on a product page is CJ's own title, printed unedited —
    "Luxury Shiny Diamond Zircon Ring" on a fifty-dollar ring. Whoever first
    wrote that sentence, the shop displaying it is the one telling a customer
    there are diamonds in it. So the word comes out, and what remains is the
    supplier's description of everything it actually is.
    """
    if not text:
        return ""
    out = str(text)
    for key in sorted(_UNNAMEABLE_KEYS, key=len, reverse=True):
        # The claim, and the words that exist only to prop it up: the plural
        # ("Pearls" is the same claim), the adjective in front of it, and the
        # conjunction on either side. Removing the noun alone left "Natural
        # Emerald and Ruby Gemstone Necklace" as "Natural and Necklace".
        out = re.sub(
            rf"(?:\b(?:natural|real|genuine|authentic|solid)\s+)?"
            rf"(?:\band\s+|\bwith\s+|&\s*)?"
            rf"\b{re.escape(key)}(?:e?s)?\b"
            rf"(?:\s+and\b|\s*&)?",
            " ", out, flags=re.IGNORECASE)
    # Left behind by the removal: doubled spaces, and the stranded punctuation
    # of a list that has lost a member.
    out = re.sub(r"\s*([,،/&|-])\s*\1+", r"\1", out)
    out = re.sub(r"\s+([,،.])", r"\1", out)
    out = re.sub(r"^[\s,،/&|-]+|[\s,،/&|-]+$", "", out)
    return re.sub(r"\s{2,}", " ", out).strip()


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
