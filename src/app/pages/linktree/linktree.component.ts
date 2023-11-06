import { Component, OnInit } from '@angular/core';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-linktree',
  templateUrl: './linktree.component.html',
  styleUrls: ['./linktree.component.scss']
})
export class LinktreeComponent implements OnInit {

  constructor(private title: PageDetailService) { }

  ngOnInit(): void {
    this.title.setDetails("linktree")
  }

}
