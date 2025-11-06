import { useEffect, useState } from 'react';
import { X, Star, Calendar, Users, Music } from 'lucide-react';
import { Anime, AnimeCharacter, ThemeSong } from '@/types/anime';
import { animeApi } from '@/services/animeApi';
import { AudioPlayer } from './AudioPlayer';

interface AnimeModalProps {
  anime: Anime;
  onClose: () => void;
}

export const AnimeModal = ({ anime, onClose }: AnimeModalProps) => {
  const [characters, setCharacters] = useState<AnimeCharacter[]>([]);
  const [themeSongs, setThemeSongs] = useState<ThemeSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSong, setSelectedSong] = useState<ThemeSong | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      setIsLoading(true);
      try {
        const [charData, themeData] = await Promise.all([
          animeApi.getAnimeCharacters(anime.mal_id),
          animeApi.getThemeSongs(anime.title),
        ]);
        setCharacters(charData);
        setThemeSongs(themeData);
      } catch (error) {
        console.error('Error fetching anime details:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [anime]);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 overflow-y-auto animate-fade-in">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onClose}
            className="fixed top-4 right-4 bg-card p-2 rounded-full hover:bg-secondary transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Hero Section */}
          <div className="relative rounded-2xl overflow-hidden mb-8 animate-slide-up">
            <div className="absolute inset-0">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt={anime.title}
                className="w-full h-full object-cover blur-2xl opacity-20"
              />
            </div>
            <div className="relative bg-gradient-card backdrop-blur-xl p-8 md:flex gap-8">
              <img
                src={anime.images.jpg.large_image_url || anime.images.jpg.image_url}
                alt={anime.title}
                className="w-full md:w-64 h-auto rounded-xl shadow-glow mx-auto md:mx-0 mb-6 md:mb-0"
              />
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2 text-foreground">
                  {anime.title_english || anime.title}
                </h1>
                {anime.title_english && (
                  <p className="text-xl text-muted-foreground mb-4">{anime.title}</p>
                )}
                
                <div className="flex flex-wrap gap-4 mb-6">
                  {anime.score && (
                    <div className="flex items-center gap-2 bg-primary/20 px-4 py-2 rounded-full">
                      <Star className="h-5 w-5 fill-primary text-primary" />
                      <span className="font-bold text-lg">{anime.score}</span>
                    </div>
                  )}
                  {anime.episodes && (
                    <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
                      <span className="font-semibold">{anime.episodes} Episodes</span>
                    </div>
                  )}
                  {anime.year && (
                    <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-full">
                      <Calendar className="h-4 w-4" />
                      <span>{anime.year}</span>
                    </div>
                  )}
                </div>

                <p className="text-foreground leading-relaxed mb-4">
                  {anime.synopsis || 'No synopsis available.'}
                </p>

                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre) => (
                      <span
                        key={genre.mal_id}
                        className="bg-gradient-accent text-white px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Theme Songs Section */}
          {themeSongs.length > 0 && (
            <div className="bg-card rounded-2xl p-6 mb-8 animate-slide-up">
              <div className="flex items-center gap-2 mb-6">
                <Music className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Theme Songs</h2>
              </div>
              <div className="grid gap-4">
                {themeSongs.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedSong(theme)}
                    className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors text-left"
                  >
                    <div className="bg-primary/20 px-3 py-2 rounded-lg font-bold text-primary">
                      {theme.type}{theme.sequence}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">
                        {theme.song?.title || 'Unknown Title'}
                      </h3>
                      {theme.song?.artists && theme.song.artists.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {theme.song.artists.map(a => a.name).join(', ')}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Characters Section */}
          {!isLoading && characters.length > 0 && (
            <div className="bg-card rounded-2xl p-6 animate-slide-up">
              <div className="flex items-center gap-2 mb-6">
                <Users className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-bold">Characters & Voice Actors</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {characters.map((char) => (
                  <div
                    key={char.character.mal_id}
                    className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl"
                  >
                    <img
                      src={char.character.images.jpg.image_url}
                      alt={char.character.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">
                        {char.character.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{char.role}</p>
                      {char.voice_actors && char.voice_actors.length > 0 && (
                        <p className="text-xs text-muted-foreground truncate">
                          {char.voice_actors[0].person.name} ({char.voice_actors[0].language})
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="text-center py-12 text-muted-foreground">
              Loading details...
            </div>
          )}
        </div>
      </div>

      {selectedSong && (
        <AudioPlayer
          song={selectedSong}
          onClose={() => setSelectedSong(null)}
        />
      )}
    </div>
  );
};
