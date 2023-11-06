import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TrialBoxComponent } from './trial-box.component';

describe('TrialBoxComponent', () => {
  let component: TrialBoxComponent;
  let fixture: ComponentFixture<TrialBoxComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TrialBoxComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TrialBoxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
