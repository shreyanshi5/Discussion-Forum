import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class TextRequest(BaseModel):
    text: str

# Response model
class ToxicityResponse(BaseModel):
    is_toxic: bool
    confidence: float
    categories: Dict[str, bool]

# Context patterns that make certain words acceptable
SAFE_CONTEXTS = {
    "hate": [
        r"i hate when",
        r"i hate that",
        r"i hate how",
        r"hate the fact",
        r"hate it when",
        r"hate this weather",
        r"hate the weather"
    ],
    "terrible": [
        r"terrible weather",
        r"weather is terrible",
        r"terrible day",
        r"day is terrible",
        r"terrible experience",
        r"experience was terrible",
        r"terrible movie",
        r"movie was terrible",
        r"terrible service",
        r"service was terrible",
        r"terrible traffic",
        r"traffic is terrible",
        r"terrible news",
        r"news is terrible"
    ],
    "awful": [
        r"awful weather",
        r"weather is awful",
        r"awful day",
        r"day is awful",
        r"awful experience",
        r"experience was awful",
        r"awful movie",
        r"movie was awful",
        r"awful service",
        r"service was awful",
        r"awful traffic",
        r"traffic is awful",
        r"awful news",
        r"news is awful"
    ]
}

# Direct insults and toxic phrases
TOXIC_PATTERNS = {
    "personal_attack": [
        r"you('re| are) (an? )?(idiot|stupid|dumb|moron|fool|loser)",
        r"you('re| are) (worthless|garbage|trash|useless|failure)",
        r"you('re| are) (terrible|awful|disgusting|pathetic|ridiculous)",
        r"i hate you",
        r"you suck",
        r"go to hell",
        r"fuck you",
        r"shut up"
    ],
    "general_toxicity": [
        r"this is (garbage|trash|bullshit)",
        r"what a (waste|joke)",
        r"this is (stupid|dumb|idiotic)",
        r"everyone here is (stupid|dumb|idiot)",
        r"all of you are (stupid|dumb|idiot)"
    ]
}

def preprocess_text(text):
    # Convert to lowercase
    text = text.lower()
    # Remove extra whitespace
    text = ' '.join(text.split())
    return text

def check_safe_context(text, word):
    """Check if a potentially toxic word is used in a safe context"""
    for pattern in SAFE_CONTEXTS.get(word, []):
        if re.search(pattern, text):
            return True
    return False

def check_toxicity(text):
    processed_text = preprocess_text(text)
    
    # Check for toxic patterns
    toxic_found = False
    categories = {
        "personal_attack": False,
        "general_toxicity": False
    }
    
    # Check personal attacks
    for pattern in TOXIC_PATTERNS["personal_attack"]:
        if re.search(pattern, processed_text):
            toxic_found = True
            categories["personal_attack"] = True
            break
    
    # Check general toxicity
    for pattern in TOXIC_PATTERNS["general_toxicity"]:
        if re.search(pattern, processed_text):
            toxic_found = True
            categories["general_toxicity"] = True
            break
    
    # Check for individual toxic words that might be in safe contexts
    toxic_words = ["hate", "terrible", "awful", "worst", "disgusting"]
    for word in toxic_words:
        if word in processed_text and not check_safe_context(processed_text, word):
            toxic_found = True
            break
    
    return {
        "is_toxic": toxic_found,
        "confidence": 1.0 if toxic_found else 0.0,
        "categories": categories
    }

@app.post("/analyze-text", response_model=ToxicityResponse)
async def analyze_text(request: TextRequest):
    try:
        result = check_toxicity(request.text)
        return ToxicityResponse(
            is_toxic=result["is_toxic"],
            confidence=result["confidence"],
            categories=result["categories"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 