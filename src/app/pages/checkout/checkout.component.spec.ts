import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { AppModule } from 'src/app/app.module';
import { CheckoutComponent } from './checkout.component';

describe('CheckoutComponent', () => {
  let component: CheckoutComponent;
  let fixture: ComponentFixture<CheckoutComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
        imports: [ AppModule ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // describe('LightswitchComp', () => {
  //   it('#clicked() should toggle #isOn', () => {
  //     const comp = new CheckoutComponent();
  //     expect(comp.showOverview).toBe(false, 'off at first');
  //   });
  
  //   // it('#clicked() should set #message to "is on"', () => {
  //   //   const comp = new LightswitchComponent();
  //   //   expect(comp.message).toMatch(/is off/i, 'off at first');
  //   //   comp.clicked();
  //   //   expect(comp.message).toMatch(/is on/i, 'on after clicked');
  //   // });
  // });
});