import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

@Component({
  selector: "app-warning",
  standalone: true,
  imports: [FormsModule],
  templateUrl: "./warning.component.html",
  styleUrl: "./warning.component.css",
})
export class WarningComponent {
  forgetWarning!: any;
  @Output() closeWarning = new EventEmitter<void>();

  close() {
    this.closeWarning.emit();
  }

  forget() {
    this.forgetWarning
      ? localStorage.setItem("warning", "forget")
      : localStorage.setItem("warning", "show");
  }
}
