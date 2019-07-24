import React from 'react';

import PropTypes from 'prop-types';
import createClass from 'create-react-class';
import BemMixin from '../utils/BemMixin';
import PureRenderMixin from '../utils/PureRenderMixin';


const CalendarSelection = createClass({
  mixins: [BemMixin, PureRenderMixin],
  displayName: "CalendarSelection",

  propTypes: {
    modifier: PropTypes.string,
  },

  render() {
    let {modifier, style} = this.props;
    let modifiers = {[modifier]: true};

    return (
      <div className={this.cx({modifiers})} style={style} />
    );
  },
});

export default CalendarSelection;
