import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import axios, { AxiosResponse } from "axios";
import { FormsModule } from "@angular/forms";
import { JSONPath } from "jsonpath-plus";
import qs from "qs";

type TrackDataTypes = {
  name: string;
  artist: string;
  image: string;
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
  };
};
@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, FormsModule],
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css", "../assets/loader.css"],
})
export class AppComponent {
  lyrics!: string[];
  trackId!: number;
  spotifyPlaylist!: string;
  chosenTrack!: string;
  chosenArtist!: string;
  isLoading: boolean = false;
  reveal: boolean = false;
  nextURL!: string;
  allTracks: string[] = [];
  allArtists: string[] = [];
  trackData: TrackDataTypes[] = [];
  showGuessingTracks: boolean = false;
  guessed!: boolean;

  async getLyrics() {
    this.isLoading = true;

    try {
      const formattedPlaylistURL =
        this.spotifyPlaylist.match(/(?<=playlist\/)[^?]+/);
      if (formattedPlaylistURL) {
        this.nextURL = `https://api.spotify.com/v1/playlists/${formattedPlaylistURL[0]}/tracks`;
      }
      await axios
        .post(
          "https://accounts.spotify.com/api/token",
          qs.stringify({
            grant_type: "client_credentials",
            client_id: "e89c58aca13d4e72bc7dc02521952367",
            client_secret: "528d500183f943a6909159a487a89d33",
          })
        )
        .then(async (res) => {
          const token = res.data.access_token;
          while (this.nextURL) {
            await axios
              .get(this.nextURL, {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              })
              .then((data) => {
                data.data.items.forEach(
                  (element: SpotifyTrackData, index: number) => {
                    this.trackData.push({
                      name: element.track.name,
                      artist: element.track.artists[0].name,
                      image: element.track.album.images[0].url,
                    });
                  }
                );
                const jsonTrackName = JSONPath({
                  path: "$.items[*].track.name",
                  json: data.data,
                });
                const jsonArtistName = JSONPath({
                  path: "$.items[*].track.artists[0].name",
                  json: data.data,
                });
                this.allTracks = this.allTracks.concat(jsonTrackName);
                this.allArtists = this.allArtists.concat(jsonArtistName);
                this.nextURL = data.data.next;
              });
          }
          const randomIndex = Math.floor(Math.random() * this.allTracks.length);
          this.chosenTrack = this.allTracks[randomIndex];
          this.chosenArtist = this.allArtists[randomIndex];
          await axios
            .get(
              `/api/ws/1.1/track.search?q=${this.chosenTrack} ${this.chosenArtist}`,
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
                .get("/api/ws/1.1/track.lyrics.get", {
                  params: {
                    track_id: this.trackId,
                    apikey: "2eed47a883d004ec2ba352100a6b057e",
                  },
                })
                .then((res) => {
                  this.isLoading = false;
                  try {
                    const r = new RegExp(this.chosenTrack, "gi");
                    const data = res.data.message.body.lyrics.lyrics_body
                      .replace(r, "████████")
                      .split("\n")
                      .filter((e: string) => e != "");
                    this.lyrics = data.slice(0, data.length - 4);
                    this.showGuessingTracks = true;
                  } catch (error) {
                    this.getLyrics();
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
    this.reveal = !this.reveal;
  }

  checkGuess(track: TrackDataTypes) {
    if (track.name === this.chosenTrack && track.artist === this.chosenArtist) {
      this.guessed = true;
    }
  }
}
