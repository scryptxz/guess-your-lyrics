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
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  lyrics!: string[] | string;
  trackId!: number;
  trackSearch!: string;
  trackName!: string;

  ngOnInit(): void {
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
            "https://api.spotify.com/v1/playlists/5MVD62fLi3lBrgpHsxtRPE?si=4a95bcd04f7f4eae",
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
            this.trackName =
              jsonTrackName[randomIndex] + " " + jsonArtistName[randomIndex];
          });
      });
  }

  getLyrics() {
    axios
      .get(`/api/ws/1.1/track.search?q=${this.trackName}`, {
        params: {
          apikey: "2eed47a883d004ec2ba352100a6b057e",
        },
      })
      .then((res: any) => {
        this.trackId = res.data.message.body.track_list[0].track.track_id;
        const result = JSONPath({
          path: "$.message.body.track_list[*].track.track_name",
          json: res.data,
        });
        console.log(result);
        // console.log(res);
        axios
          .get("/api/ws/1.1/track.lyrics.get", {
            params: {
              track_id: this.trackId,
              apikey: "2eed47a883d004ec2ba352100a6b057e",
            },
          })
          .then((res) => {
            console.log(res);
            try {
              const data = res.data.message.body.lyrics.lyrics_body
                .split("\n")
                .filter((e: string) => e != "");
              this.lyrics = data.slice(0, data.length - 4);
            } catch (error) {
              this.lyrics = "Lyrics not found";
            }
          });
      });
  }
}
