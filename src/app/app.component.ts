import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterOutlet } from "@angular/router";
import axios, { AxiosResponse } from "axios";
import { FormsModule } from "@angular/forms";
import { JSONPath } from "jsonpath-plus";
import qs from "qs";
type SearchType = {
  message: {
    body: {
      track_list: {
        track: {
          track_id: number;
        };
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
  trackName!: string;
  artistName!: string;
  isLoading: boolean = false;
  reveal: boolean = false;

  getLyrics() {
    this.isLoading = true;
    axios
      .post(
        "https://accounts.spotify.com/api/token",
        qs.stringify({
          grant_type: "client_credentials",
          client_id: "e89c58aca13d4e72bc7dc02521952367",
          client_secret: "2af4f0ee57934ebda2bbad747027c7b4",
        })
      )
      .then((res) => {
        const token = res.data.access_token;
        axios
          .get(
            `https://api.spotify.com/v1/playlists/${this.spotifyPlaylist.slice(
              34
            )}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )
          .then((res) => {
            const jsonTrackName = JSONPath({
              path: "$.tracks.items[*].track.name",
              json: res.data,
            });
            const jsonArtistName = JSONPath({
              path: "$.tracks.items[*].track.artists[0].name",
              json: res.data,
            });
            const randomIndex = Math.floor(Math.random() * 100);
            console.log(randomIndex);
            this.trackName = jsonTrackName[randomIndex];
            this.artistName = jsonArtistName[randomIndex];
          })
          .then(() => {
            axios
              .get(
                `/api/ws/1.1/track.search?q=${this.trackName} ${this.artistName}`,
                {
                  params: {
                    apikey: "2eed47a883d004ec2ba352100a6b057e",
                  },
                }
              )
              .then((res: any) => {
                const result = JSONPath({
                  path: `$.message.body.track_list[?(@.track.artist_name == "${this.artistName}" && @.track.track_name.match(/${this.trackName}/gi))].track.track_id`,
                  json: res.data,
                });
                console.log(result);
                console.log(res);
                this.trackId = result[0];
                axios
                  .get("/api/ws/1.1/track.lyrics.get", {
                    params: {
                      track_id: this.trackId,
                      apikey: "2eed47a883d004ec2ba352100a6b057e",
                    },
                  })
                  .then((res) => {
                    this.isLoading = false;
                    console.log(res);
                    try {
                      const r = new RegExp(this.trackName, "gi");
                      const data = res.data.message.body.lyrics.lyrics_body
                        .replace(r, "████████")
                        .split("\n")
                        .filter((e: string) => e != "");
                      this.lyrics = data.slice(0, data.length - 4);
                    } catch (error) {
                      this.lyrics = ["Lyrics not found"];
                    }
                  });
              });
          });
      });
  }

  revealTrack() {
    this.reveal = !this.reveal;
  }
}
