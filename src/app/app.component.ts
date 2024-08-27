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
  nextURL!: string | null;
  allTracks: string[] = [];
  allArtists: string[] = [];
  trackData: TrackDataTypes[] = [];
  showGuessingTracks: boolean = false;
  guessed!: boolean;
  searchQuery: string = "";
  searchResults!: TrackDataTypes[];

  async getLyrics() {
    this.isLoading = true;
    this.lyrics = [];
    this.reveal = false;
    this.allTracks = [];
    this.allArtists = [];
    this.trackData = [];
    this.showGuessingTracks = false;
    this.guessed = false;
    this.searchQuery = "";

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
            client_id: "54e1c1ed18694a4783e400e6647c8109",
            client_secret: "d88c4932b8cb456e976aeaedb74f4a42",
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
                data.data.items.forEach((element: SpotifyTrackData) => {
                  try {
                    this.trackData.push({
                      name: element.track.name,
                      artist: element.track.artists[0].name,
                      image: element.track.album.images[0].url,
                    });
                  } catch (error) {
                    console.log(element);
                  }
                });
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
                  console.log(res);
                  this.isLoading = false;
                  try {
                    const r = new RegExp(this.chosenTrack, "gi");
                    const data = res.data.message.body.lyrics.lyrics_body
                      .replace(r, "████████")
                      .split("\n")
                      .filter((e: string) => e != "");
                    this.lyrics = data.slice(0, data.length - 4);
                    this.searchResults = this.trackData;
                    this.showGuessingTracks = true;
                  } catch (error) {
                    // this.getLyrics();
                    console.log(error);
                    this.isLoading = false;
                  }
                });
            });
        });
    } catch (error) {
      console.log(error);
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

  searchTrack() {
    this.searchResults = this.trackData.filter(
      (e: TrackDataTypes) =>
        e.name
          .toLocaleLowerCase()
          .includes(this.searchQuery.toLocaleLowerCase()) ||
        e.artist
          .toLocaleLowerCase()
          .includes(this.searchQuery.toLocaleLowerCase())
    );
  }
}
