import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UniversoView } from './universo-view';

describe('UniversoView', () => {
  let component: UniversoView;
  let fixture: ComponentFixture<UniversoView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniversoView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UniversoView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
