import nltk
from nltk.stem import WordNetLemmatizer
from nltk import pos_tag

try:
    nltk.data.find("taggers/averaged_perceptron_tagger_eng")
except Exception:
    nltk.download("averaged_perceptron_tagger_eng", quiet=True)

try:
    nltk.data.find("corpora/wordnet")
except Exception:
    nltk.download("wordnet", quiet=True)

lemmatizer = WordNetLemmatizer()


def asl_convert(text):
    text = text.lower()

    fillers = {
        "is","are","am","the","a","an","to","will",
        "was","were","be","been","being","and","that",
        "had","of","for","in","on","at"
    }

    # 🔥 tokenization (simple, stable)
    words = text.split()

    # 🔥 POS tagging (with fallback safety)
    try:
        tagged = pos_tag(words)
    except Exception:
        tagged = [(w, "") for w in words]

    cleaned = []

    for word, tag in tagged:

        if word in fillers:
            continue

        # 🔥 verb → base form (tense removal)
        if tag.startswith("V"):
            base = lemmatizer.lemmatize(word, "v")
            cleaned.append(base)
        else:
            cleaned.append(word)

    # 🔥 ASL time priority
    time_words = {"today","tomorrow","yesterday","now","next"}

    time = [w for w in cleaned if w in time_words]
    rest = [w for w in cleaned if w not in time_words]

    return " ".join(time + rest).upper()