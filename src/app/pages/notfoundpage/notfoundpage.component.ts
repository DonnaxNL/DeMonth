import { Component, OnInit } from "@angular/core";
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: "app-notfoundpage",
  templateUrl: "./notfoundpage.component.html",
  styleUrls: ["./notfoundpage.component.scss"]
})
export class NotfoundpageComponent implements OnInit {
  constructor(private title: PageDetailService) {}

  ngOnInit() {
    this.title.setDetails("not_found");
  }
}
