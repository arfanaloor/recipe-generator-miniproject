import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from 'base64-js';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

let API_KEY = 'AIzaSyA9NTAggDsMuSFy3KCtwImk09Fje3a0BPQ';

let form = document.querySelector('form');
let imagePromptInput = "detect each ingredient in this image. Output should be in the format 'ingredient1,ingredient2,ingredient3....' don't show any other output structure";
let recipePrompt = "Create a recipe using the following ingredients. display the output in a good structure with heading and bullet points. make it very readable and short";
let outputString = ""; // Variable to store the output string
let recipeString = ""; // Variable to store the recipe result

form.onsubmit = async (ev) => {
  ev.preventDefault();
  let ingredientsOutput = document.querySelector('#ingredients-output');
  let recipeOutput = document.querySelector('#recipe-output');
  ingredientsOutput.textContent = 'Processing...';
  recipeOutput.textContent = ''; // Clear previous recipe

  try {
    // Load the image as a base64 string
    const fileInput = document.getElementById('fileinput');
    const file = fileInput.files[0];

    if (!file) {
      ingredientsOutput.textContent = "Please select an image.";
      return;
    }

    const imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });

    // First API call to detect ingredients
    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
          { text: imagePromptInput }
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const ingredientResult = await model.generateContentStream({ contents });

    // Read the detected ingredients
    let buffer = [];
    for await (let response of ingredientResult.stream) {
      buffer.push(response.text());
    }
    outputString = buffer.join('');
    
    if (!outputString) {
      ingredientsOutput.textContent = "No ingredients detected.";
      return;
    }

    ingredientsOutput.textContent = `Ingredients: ${outputString}`;

    // Second API call to generate a recipe using the detected ingredients
    let recipeContents = [
      {
        role: 'user',
        parts: [
          { text: `${recipePrompt} ${outputString}` }
        ]
      }
    ];

    const recipeResult = await model.generateContentStream({ contents: recipeContents });

    // Read the recipe result
    buffer = [];
    for await (let response of recipeResult.stream) {
      buffer.push(response.text());
    }
    recipeString = buffer.join('');

    // Display the generated recipe
    recipeOutput.textContent = recipeString;
  } catch (e) {
    ingredientsOutput.textContent = 'Error: ' + e.message;
  }
};

// You can delete this once you've filled out an API key
maybeShowApiKeyBanner(API_KEY);
