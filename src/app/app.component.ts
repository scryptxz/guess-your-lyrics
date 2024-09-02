import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import axios from "axios";
import { FormsModule } from "@angular/forms";
import { JSONPath } from "jsonpath-plus";
import qs from "qs";
import { WarningComponent } from "./warning/warning.component";

type TrackDataTypes = {
  id: number;
  name: string;
  artist: string;
  image: string;
  preview_url?: string;
};

type SpotifyTrackData = {
  track: {
    name: string;
    artists: {
      name: string;
    }[];
    album: {
      images: {
        url: string;
      }[];
    };
    preview_url?: string;
  };
};
@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule, WarningComponent],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css", "../assets/loader.css"],
})
export class AppComponent {
  // Arrays
  searchResults!: TrackDataTypes[];
  allTracks: string[] = [];
  allArtists: string[] = [];
  trackData: TrackDataTypes[] = [];
  lyrics: string[] = [];

  // Booleans
  guessed!: boolean;
  rightGuess!: boolean;
  isLoading: boolean = false;
  reveal: boolean = false;
  showGuessingTracks: boolean = false;
  showWarning: boolean = true;

  // Numbers
  trackId!: number;
  chosenIndex!: number;
  guessedIndex!: number;

  // Strings
  chosenTrack!: string;
  chosenArtist!: string;
  nextURL!: string | null;
  searchQuery: string = "";
  spotifyPlaylist: string = "";

  ngOnInit(): void {
    if (localStorage.getItem("warning") === "forget") {
      this.showWarning = false;
    }
  }

  async getLyrics() {
    // Reset states when the user submit the form
    this.lyrics = [];
    this.allTracks = [];
    this.allArtists = [];
    this.trackData = [];
    this.isLoading = true;
    this.reveal = false;
    this.showGuessingTracks = false;
    this.guessed = false;
    this.rightGuess = false;
    this.searchQuery = "";
    this.guessedIndex = -1;

    // Check if the playlist input is empty
    if (this.spotifyPlaylist.length === 0) {
      alert("Please, enter your playlist");
      this.isLoading = false;
      return;
    }
    try {
      // Format the playlist input value to only retrieve the playlist ID
      const formattedPlaylistURL =
        this.spotifyPlaylist.match(/(?<=playlist\/)[^?]+/);
      if (formattedPlaylistURL) {
        this.nextURL = `https://api.spotify.com/v1/playlists/${formattedPlaylistURL[0]}/tracks`;
      }

      // Get spotify API token
      await axios
        .post(
          "https://accounts.spotify.com/api/token",
          qs.stringify({
            grant_type: "client_credentials",
            client_id: "54e1c1ed18694a4783e400e6647c8109",
            client_secret: "d88c4932b8cb456e976aeaedb74f4a42",
          })
        )
        .then(async (res) => {
          const token = res.data.access_token;
          let i = 0; // Setting track ID

          // Loop until the next url is null
          while (this.nextURL) {
            await axios
              .get(this.nextURL, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              .then((data) => {
                data.data.items.forEach((element: SpotifyTrackData) => {
                  if (!element.track.preview_url) {
                    console.log(element.track.name);
                  }
                  try {
                    if (element.track.album.images.length > 0) {
                      this.trackData.push({
                        id: i++,
                        name: element.track.name,
                        artist: element.track.artists[0].name,
                        image: element.track.album.images[0].url,
                        preview_url: element.track.preview_url,
                      });
                    }
                  } catch (error) {
                    console.log(error);
                  }
                });
                this.nextURL = data.data.next;
              });
          }
          // Retrieve only the names of the tracks
          const jsonTrackName = JSONPath({
            path: "$[*].name",
            json: this.trackData,
          });

          // Retrieve only the artist names of the tracks
          const jsonArtistName = JSONPath({
            path: "$[*].artist",
            json: this.trackData,
          });

          console.log(jsonTrackName);

          this.allTracks = this.allTracks.concat(jsonTrackName);
          this.allArtists = this.allArtists.concat(jsonArtistName);

          // Get a random track and artist
          this.chosenIndex = Math.floor(Math.random() * this.allTracks.length);
          this.chosenTrack = this.allTracks[this.chosenIndex];
          this.chosenArtist = this.allArtists[this.chosenIndex];

          await axios
            .get(
              `https://cors-anywhere.herokuapp.com/https://api.musixmatch.com/ws/1.1/track.search?q=${this.chosenTrack} ${this.chosenArtist}`,
              {
                params: {
                  apikey: "2eed47a883d004ec2ba352100a6b057e",
                },
              }
            )
            .then(async (res) => {
              const result = JSONPath({
                path: `$.message.body.track_list[?(@.track.artist_name == "${this.chosenArtist}" && @.track.track_name.match(/${this.chosenTrack}/gi))].track.track_id`,
                json: res.data,
              });
              this.trackId = result[0];
              await axios
                .get(
                  "https://cors-anywhere.herokuapp.com/https://api.musixmatch.com/ws/1.1/track.lyrics.get",
                  {
                    params: {
                      track_id: this.trackId,
                      apikey: "2eed47a883d004ec2ba352100a6b057e",
                    },
                  }
                )
                .then((res) => {
                  this.isLoading = false;
                  try {
                    const r = new RegExp(this.chosenTrack, "gi");
                    if (Object.hasOwn(res.data.message.body, "lyrics")) {
                      const data = res.data.message.body.lyrics.lyrics_body
                        .replace(r, "████████")
                        .split("\n")
                        .filter((e: string) => e != "");
                      this.lyrics = data.slice(0, data.length - 4);
                      this.searchResults = this.trackData;
                      this.showGuessingTracks = true;
                    }
                    if (this.lyrics.length === 0) {
                      this.getLyrics();
                    }
                  } catch (error) {
                    alert("Some error occurred.");
                    console.log(error);
                  }
                });
            });
        });
    } catch (error) {
      alert("Invalid or private playlist");
      this.isLoading = false;
    }
  }

  revealTrack() {
    const confirmReveal = confirm("Are you sure you want to reveal the track?");
    if (confirmReveal) {
      this.searchResults = this.trackData.filter(
        (e: TrackDataTypes) => e.id === this.chosenIndex
      );
      this.rightGuess = true;
    }
  }

  checkGuess(guessedIndex: number) {
    if (!this.rightGuess) {
      this.guessed = true;
      if (guessedIndex === this.chosenIndex) {
        this.rightGuess = true;
      }
      this.guessedIndex = guessedIndex;
    }
  }

  searchTrack() {
    this.searchResults = this.trackData.filter((e: TrackDataTypes) => {
      if (e.artist) {
        return (
          e.name
            .toLocaleLowerCase()
            .includes(this.searchQuery.toLocaleLowerCase()) ||
          e.artist
            .toLocaleLowerCase()
            .includes(this.searchQuery.toLocaleLowerCase())
        );
      } else {
        return false;
      }
    });
  }

  closeWarning() {
    this.showWarning = false;
  }
}
