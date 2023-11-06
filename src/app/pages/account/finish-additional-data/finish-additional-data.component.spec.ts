import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from 'src/app/app.module';
import { UserAddress } from 'src/app/models/address';
import { UserData } from 'src/app/models/userdata';

import { FinishAdditionalDataComponent } from './finish-additional-data.component';

describe('FinishAdditionalDataComponent', () => {
  let component: FinishAdditionalDataComponent;
  let fixture: ComponentFixture<FinishAdditionalDataComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [ AppModule ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FinishAdditionalDataComponent);
    component = fixture.componentInstance;
    const address = new UserAddress('','','','','','','')
    component.currentUserData = new UserData('','','',address,'','','')
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
