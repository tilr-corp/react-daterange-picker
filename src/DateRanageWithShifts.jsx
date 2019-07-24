/* eslint-disable react/no-multi-comp */

import React from 'react';

import PropTypes from 'prop-types';
import createClass from 'create-react-class';
import moment from './moment-range';
import RangePicker from '../src';

const DatePickerRange = createClass({
  propTypes: {
    value: PropTypes.object,
  },

  getInitialState() {
    return {
      datesAdded: {},
      value: this.props.value,
      states: null,
    };
  },

  render() {
    return (
      <div>
        <RangePicker {...this.props} value={this.state.value} datesAdded={this.state.datesAdded}/>
        <div>
          <input type="text"
                 value={this.state.value ? this.state.value.start.format('LL') : ""}
                 readOnly={true}
                 placeholder="Start date"/>
          <input type="text"
                 value={this.state.value ? this.state.value.end.format('LL') : ""}
                 readOnly={true}
                 placeholder="End date"/>
        </div>
      </div>
    );
  },
});

const PENDING = 'pending';
const BOOKED = 'booked';
const EDITING = 'editing';


const DateRangeWithShiftDates = createClass({

  getInitialState() {
    return {
      locale: 'en',
      shifts: [],
      isBeingEdited: [],
      checked: {},
      hoverRange: false,
      dateStates: [
        {
          state: BOOKED,
          range: moment.range(
            moment('2016-04-01'),
            moment('2016-04-10'),
          ),
        },
      ],
    };
  },

  getDefaultProps() {
    return {};
  },

  _selectLocale() {
    const locale = this.refs.locale.value;
    if (locale !== 'en') {
      require(`moment/locale/${locale}`);
    }
    moment.locale(locale);

    this.setState({
      locale: locale,
    });
  },
  onSelect(value, states) {
    //  We need to add the value to datestates
    this.state.dateStates.push({state: PENDING, range: value});
    this.setState(previousState => ({
      dateStates: previousState.dateStates,
    }));
    this.shouldIBeChecked();

  },
  doesDateContainDay(range, dayNumber) {
    return Array.from(range.by('days')).some(day => day.format('d') === dayNumber);
  },
  dateStateFilter(stateName) {
    const {dateStates} = this.state;
    const stateNa = Array.isArray(stateName) ? stateName : [stateName];
    return dateStates.filter(state => stateNa.includes(state.state));
  },
  dateStateMerge(item, stateName, reverse) {
    return this.dateStateFilter(stateName).concat(item);
  },
  getStateForDate(date) {
    return this.state.dateStates.find(state => state.range.contains(date));
  },
  getAndRemoveStateForDate(date) {
    this.getStateForDate(date);

  },
  changeStateToState(fromState, toState) {
    const states = [...this.state.dateStates];
    const newStates = states.map(item => {
      if (item.state === fromState) {
        item.state = toState;
      }
      return item;
    });

    this.setState({
      dateStates: newStates,
    });


  },
  changeSingleStateToo(date, state) {
    console.log(date);
    const newState = this.getStateForDate(date).state;
    newState.state = state;
    this.setState(previous => ({
        dateStates: [...previous, ...newState],
      }),
    )
    ;

  },
  changeRangeStateRight(date, stateTo) {
    const state = this.getStateForDate(date);
    const {start: originalStart, end: originalEnd} = state.range;
    let start;
    start = originalStart.clone();
    const addToState = [
      {
        state: stateTo,
        range: moment.range(originalStart, originalStart),
      },
      {
        state: state.state,
        range: moment.range(start.add(1, 'd'), originalEnd),
      },
    ];

    this.setState({
      dateStates: this.dateStateMerge(addToState, [EDITING, BOOKED]),
    });
  },
  changeRangeStateLeft(date, stateTo) {
    const state = this.getStateForDate(date);
    const {start: originalStart, end: originalEnd} = state.range;
    let end;
    end = originalEnd.clone();
    const addToState = [
      {
        state: state.state,
        range: moment.range(originalStart, end.subtract(1, 'd')),
      },
      {
        state: stateTo,
        range: moment.range(originalEnd, originalEnd),

      },
    ];

    this.setState({
      dateStates: this.dateStateMerge(addToState, EDITING),
    });
  },
  changeRangeStateToo(date, originalState, stateTo) {
    const range = this.getStateForDate(date).range;
    const {start: originalStart, end: originalEnd} = range;
    let start, diff, end;
    start = originalStart.clone();
    diff = moment.duration(date.diff(start, 'days') - 1, 'days');
    end = originalStart.add(diff, 'days');
    const addToState = [
      {
        state: originalState,
        range: moment.range(start, end),
      },
      {
        state: stateTo,
        range: moment.range(date, date),
      },
      {
        state: originalState,
        range: moment.range(end.add(2, 'd'), originalEnd),
      },
    ];
    this.setState({
      dateStates: this.dateStateMerge(addToState, [EDITING, BOOKED]),
    });
  },
  splitDateRange(dates, stateTo = 'available') {
    const datesToBreakOn = Array.isArray(dates) ? dates : [dates];
    return datesToBreakOn.map((date, idx) => {
      let originalState = this.getStateForDate(date).state;
      if (this.isSingle(date)) {
        this.changeSingleStateToo(date, EDITING);
      } else if (this.isShiftWithinRange(date)) {
        this.changeRangeStateToo(date, originalState, stateTo);
      } else if (this.isStateAfterDateDifferent(date)) {
        this.changeRangeStateLeft(date, EDITING);

      } else if (this.isStateBeforeDateDifferent(date)) {
        this.changeRangeStateRight(date, EDITING);
      } else {
        console.log("you're in a pickle");
      }
    });

  },
  handleDayChange(event) {
    const dayValue = event.target.value;

    const newDateState = this.dateStateFilter('pending').map(state => {
      if (!this.doesDateContainDay(state.range, dayValue)) {
        return state;
      }

      const breakDates = Array.from(state.range.by('days')).filter(date => date.format('d') === dayValue);
      const breakDateCount = breakDates.length;

      const {start: originalStart, end: originalEnd} = state.range;

      return [...Array(breakDateCount + 1)].map((_, i) => {
        let start;
        let end;
        // First Loop
        if (i === 0) {
          start = originalStart;
          end = breakDates[i].subtract(1, 'd');
        } else if (i === breakDateCount) {
          //last
          start = breakDates[i - 1].add(2, 'd');
          end = originalEnd;
        } else {
          start = breakDates[i - 1].add(2, 'd');
          end = breakDates[i].subtract(1, 'd');
        }

        return {
          state: state.state,
          range: moment.range(moment(start), moment(end)),
        };

      });


    });

    this.setState({
      dateStates: this.dateStateMerge(newDateState.flat(3), 'booked'),
    }, this.shouldIBeChecked);
  },

  shouldIBeChecked() {
    const {dateStates} = this.state;
    const allDays = this.dateStateFilter('pending').reduce((mainObject, state) => {
      const days = Array.from(state.range.by('days')).reduce((obj, item) => {
        obj[item.format('d')] = true;
        return obj;
      }, {});
      return {...mainObject, ...days};
    }, {});
    this.setState({
      checked: allDays,
    });
  },
  confirmState() {
    const {dateStates} = this.state;
    const startTime = '10am';
    const endTime = '5pm';
    const breakMins = null;

    const newState = this.dateStateFilter(PENDING).map(state => {
      const shifts = [];
      Array.from(state.range.by('days')).forEach((date) => {
        shifts.push({
          date,
          id: Math.floor(Math.random() * (1000 - 4)) + 4,
          start: startTime,
          end: endTime,
          breaks: breakMins,
        });
      });
      this.setState(pre => ({
        shifts: [...pre.shifts, ...shifts],
      }));

      return {...state, state: 'booked'};
    });
    this.setState({
      dateStates: this.dateStateMerge(newState, BOOKED),
    }, this.shouldIBeChecked);

  },
  hasConfirmedShifts() {
    return this.state.shifts.length > 0;
  },
  getEachShift() {
    return this.state.shifts;
  },
  isSingle(date) {
    return this.isStateBeforeDateDifferent(date) && this.isStateAfterDateDifferent(date);
  },
  isStateBeforeDateDifferent(date) {
    const day = moment.duration(1, 'd');
    const dateToCheck = date.clone();
    return !this.state.dateStates.filter(state => state.range.contains(dateToCheck)).some(i => i.range.contains(dateToCheck.subtract(day)));
  },
  isStateAfterDateDifferent(date) {
    const day = moment.duration(1, 'd');
    const dateToCheck = date.clone();
    return !this.state.dateStates.filter(state => state.range.contains(dateToCheck)).some(i => i.range.contains(dateToCheck.add(day)));
  },
  isShiftWithinRange(date) {
    return !this.isStateBeforeDateDifferent(date) && !this.isStateAfterDateDifferent(date);
  },
  deselectState(stateName = 'pending') {
    const {dateStates} = this.state;
    const newState = dateStates.filter(state => state.state !== stateName);
    this.setState({
      dateStates: newState,
    }, this.shouldIBeChecked);
  },
  componentDidMount() {
    this.shouldIBeChecked();
  },
  addSingleDateState(date, stateType) {
    const {dateStates} = this.state;

    const newState = {
      state: stateType,
      range: moment.range(date, date),
    };

    dateStates.unshift(newState);

    this.setState({
      dateStates,
    });

  },
  addEditedShift(dateToEdit) {
    this.setState(previous => ({
      isBeingEdited: previous.isBeingEdited.concat(dateToEdit),
    }));
  },
  removeEditShift(dateToEdit) {
    const {isBeingEdited} = this.state;
    const isEdit = [...isBeingEdited];
    isEdit.splice(isBeingEdited.findIndex(date => date.isSame(dateToEdit)), 1);
    this.setState({
      isBeingEdited: isEdit,
    });
    //this.removeStateFromEdit(dateToEdit);
  },
  editShift(date) {
    const {isBeingEdited} = this.state;
    const dateToEdit = this.state.shifts.find(shift => shift.date.isSame(date, 'day'));

    if (isBeingEdited.some(d => d.isSame(dateToEdit.date))) {
      this.removeEditShift(dateToEdit.date);
    } else {
      this.addEditedShift(dateToEdit.date);
    }
  },
  nHighlightDate(date, state) {
    const withinBooked = this.dateStateFilter([BOOKED, EDITING]).filter(d => d.range.contains(date));
    if (withinBooked.length >= 1) {
      const otherStates = this.state.dateStates.filter(s => !s.range.contains(date));
      const s = otherStates.map(stat => ({...stat, state: PENDING}));
      this.setState({
        hoverRange: true,
        dateStates: [...s, ...withinBooked],
      });
    } else if (this.state.hoverRange) {
      this.changeStateToState(PENDING, BOOKED);
      this.setState({
        hoverRange: false,
      });

    }

  },
  clickToEditShfits(date) {
    console.log(date, "ASFAS");
    const state = this.getStateForDate(date);
    this.state.shifts.filter(shift => state.range.contains(shift.date)).forEach(s => this.editShift(s.date));
  },
  render() {
    const stateDefinitions = {
      available: {
        color: '#ffffff',
        label: 'Available',
      },
      [BOOKED]: {
        selectable: false,
        color: '#2696BA',
        label: 'booked',
      },
      [PENDING]: {
        selectable: false,
        color: '#87BAC9',
        label: 'pending',
      },
      [EDITING]: {
        selectable: false,
        color: 'red',
        label: 'editing',
      },
    };
    return (
      <main>
        <div className="content">
          <div className="example">
            <DatePickerRange
              firstOfWeek={0}
              numberOfCalendars={2}
              selectionType='range'
              minimumDate={new Date()}
              maximumDate={moment().add(2, 'years').toDate()}
              stateDefinitions={stateDefinitions}
              dateStates={this.state.dateStates}
              defaultState="available"
              showLegend={false}
              onSelect={this.onSelect}
              shiftsBeingEdited={this.state.isBeingEdited}
              singleDateRange={true}
              onHighlightRange={this.nHighlightRange}
              onHighlightDate={this.nHighlightDate}
              onSelectStart={this.onSelectStart}
              hoverRange={this.state.hoverRange}
              clickToEditShfits={this.clickToEditShfits}

            />

            <p>Days of the week selected</p>
            <input type="checkbox" name="day" value="0"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[0]}/> Sun
            <input type="checkbox" name="day" value="1"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[1]}/> Mo
            <input type="checkbox" name="day" value="2"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[2]}/> Tue
            <input type="checkbox" name="day" value="3"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[3]}/> Wed
            <input type="checkbox" name="day" value="4"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[4]}/> Th
            <input type="checkbox" name="day" value="5"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[5]}/> Fr
            <input type="checkbox" name="day" value="6"
                   onChange={this.handleDayChange}
                   checked={this.state.checked[6]}/> Sat

            <button onClick={() => this.deselectState()}>Deselect</button>
            <button onClick={() => this.confirmState()}>Confirm</button>
          </div>
          {this.hasConfirmedShifts && this.getEachShift().map(shift => {
            return (<div style={{display: 'flex', justifyContent: 'space-between'}} key={shift.id}>
              <input type="checkbox" name={shift.id} value={shift.id}
                     onChange={() => this.editShift(shift.date)}
                     checked={this.state.isBeingEdited.some(s => s.isSame(shift.date), 'day')}/>

              <div>{shift.date.format('ddd, MMM Do')}</div>
              <div>{shift.start} </div>
              <div>{shift.end}</div>
              <div>{shift.breaks}</div>
            </div>);
          })

          }
        </div>
      </main>
    );
  },
});

export default DateRangeWithShiftDates;
