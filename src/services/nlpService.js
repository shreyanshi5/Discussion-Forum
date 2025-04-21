const NLP_API_URL = 'http://localhost:8000';

export const checkMessage = async (text) => {
  try {
    const response = await fetch(`${NLP_API_URL}/analyze-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error('Failed to analyze message');
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking message:', error);
    throw error;
  }
}; 