import { Component, Input, OnInit } from '@angular/core';
import { UserAddress } from 'src/app/models/address';

@Component({
  selector: 'address-view',
  templateUrl: './address-view.component.html',
  styleUrls: ['./address-view.component.scss']
})
export class AddressViewComponent implements OnInit {
  @Input() userAddress: UserAddress;

  constructor() { }

  ngOnInit(): void {
  }
}
