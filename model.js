const fs = require('fs');
const csv = require('csv-parser');
const readline = require('readline-sync');

// CSV containing song data
const csvFilePath = 'spotify_millsongdata.csv';

// Library of emotion
const emotionFiles = [
  'anger.txt',
  'disgust.txt',
  'fear.txt',
  'guilt.txt',
  'joy.txt',
  'sadness.txt',
  'shame.txt'
];

// Array to store song data
const songs = [];

// Map to store emotion word sets and their counts
const emotionWordSets = new Map();
const emotionWordCounts = {};

// Initialize counts for each emotion and create sets of emotion words
emotionFiles.forEach(emotionFile => {
  const emotion = emotionFile.replace('.txt', '');
  emotionWordSets.set(emotion, new Set());
  emotionWordCounts[emotion] = 0;

  // Read and populate the set of emotion words for each emotion
  const emotionWordsData = fs.readFileSync(emotionFile, 'utf-8');
  emotionWordsData.split('\n').forEach(word => {
    const trimmedWord = word.trim().toLowerCase();
    if (trimmedWord.length > 0) {
      emotionWordSets.get(emotion).add(trimmedWord);
    }
  });
});

// Read the CSV file and populate the songs array
fs.createReadStream(csvFilePath)
  .pipe(csv())
  .on('data', (row) => {
    songs.push(row);
  })
  .on('end', () => {
    // Ask the user to input their current emotion
    const userEmotion = readline.question('Enter your current emotion (Anger/Disgust/Fear/Guilt/Joy/Sadness/Shame): ').toLowerCase();

    // Ask the user to input the artist's name/s and if none
    const artistInput = readline.question('Enter the artist/s you want (comma-separated if multiple type ("x") if none): ').toLowerCase();
    const selectedArtists = artistInput === 'x'?[]: artistInput.split(',').map(artist => artist.trim());

    // Process each song to determine its emotion
    songs.forEach(song => {
      // Initialize counts for each emotion of each song
      const songEmotionCounts = {};

      // Count emotion words in the lyrics of each song
      const words = new Set(song.text.toLowerCase().split(/\s+/));
      emotionFiles.forEach(emotionFile => {
        const emotion = emotionFile.replace('.txt', '');
        songEmotionCounts[emotion] = 0;

        words.forEach(word => {
          if (emotionWordSets.get(emotion).has(word)) {
            songEmotionCounts[emotion]++;
          }
        });
      });

      // Determine the emotion with the highest count for the current song
      let maxEmotion = '';
      let maxCount = 0;
      Object.entries(songEmotionCounts).forEach(([emotion, count]) => {
        if (count > maxCount) {
          maxCount = count;
          maxEmotion = emotion;
        }
      });

      // Assign the determined emotion and count to the song
      song.determinedEmotion = maxEmotion;
      song.emotionCount = maxCount;
    });

    // Filter songs based on the user's current emotion and selected artist/s
    const topSongs = songs
      .filter(song => song.determinedEmotion === userEmotion && (selectedArtists.length === 0 || selectedArtists.includes(song.artist.toLowerCase())))
      .sort((a, b) => b.sentimentScore - a.sentimentScore || Math.random() - 0.5)
      .slice(0, 20);

    // Display the top 20 songs based on and selected artist/s and emotion
    console.log(`Top Songs of ${selectedArtists.length > 0 ? '' +selectedArtists.join(', '): ''} about (${userEmotion}):`);
    topSongs.forEach((song, index) => {
      console.log(`${index + 1}. Artist: ${song.artist}, Song: ${song.song}, Emotion: ${song.determinedEmotion}, Count: ${song.emotionCount}`);
    });
  });
