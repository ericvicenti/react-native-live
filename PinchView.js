import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Animated,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  TouchableWithoutFeedback
} from "react-native";

export default class PinchView extends React.Component {
  _screenAspectRatio = this.props.width / this.props.height;
  _photoAspectRatio = this.props.photo.width / this.props.photo.height;
  _isWidePhoto = this._screenAspectRatio < this._photoAspectRatio;

  _initScale = this._isWidePhoto
    ? this.props.width / this.props.photo.width
    : this.props.height / this.props.photo.height;
  _initX = (this.props.width - this.props.photo.width) / 2;
  _initY = (this.props.height - this.props.photo.height) / 2;

  // current photo state
  _accumScale = this._initScale;
  _accumX = this._initX;
  _accumY = this._initY;

  // photo animation values:
  _xOffset = new Animated.Value(this._accumX);
  _yOffset = new Animated.Value(this._accumY);
  _scale = new Animated.Value(this._accumScale);

  // gesture state:
  _pinchStartDistance = null;
  _currentPinchScale = 1;
  _currentGestureX = 0;
  _currentGestureY = 0;

  _animateTo = (animValue, destValue) => {
    Animated.spring(animValue, {
      toValue: destValue,
      useNativeDriver: true,
      friction: 4,
      tension: 40,
      duration: 200
    }).start();
    // animValue.setValue(destValue);
  };

  _setResponderMove = (e, gestureState) => {
    this._currentGestureX = gestureState.dx;
    this._currentGestureY = gestureState.dy;
    this._currentPinchScale = 1;
    const { touches } = e.nativeEvent;

    if (touches.length === 2) {
      const deltaX = touches[0].pageX - touches[1].pageX;
      const deltaY = touches[0].pageY - touches[1].pageY;
      const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      if (!this._pinchStartDistance) {
        this._pinchStartDistance = delta;
      } else {
        const pinchVal = delta / this._pinchStartDistance;
        this._currentPinchScale = pinchVal;
      }
    } else {
      this._pinchStartDistance = null;
    }
    if (this._moveTimeout) {
      return;
    }
    this._moveTimeout = setTimeout(() => {
      const destXOffset =
        this._currentGestureX / this._accumScale + this._accumX;
      const destYOffset =
        this._currentGestureY / this._accumScale + this._accumY;
      const destScale = this._currentPinchScale * this._accumScale;
      this._animateTo(this._xOffset, destXOffset);
      this._animateTo(this._yOffset, destYOffset);
      this._animateTo(this._scale, destScale);
      this._moveTimeout = null;
    }, 80);
  };

  _panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (e, gestureState) => {
      return true;
    },
    onMoveShouldSetPanResponder: (e, gestureState) => {
      return true;
    },
    onPanResponderGrant: (e, gestureState) => {
      // console.log("granted!");
    },
    onPanResponderMove: (e, gestureState) => {
      this._setResponderMove(e, gestureState);
    },
    onPanResponderRelease: (e, gestureState) => {
      clearTimeout(this._moveTimeout);
      this._moveTimeout = null;
      this._accumScale = this._accumScale * this._currentPinchScale;
      this._accumX = this._accumX + this._currentGestureX / this._accumScale;
      this._accumY = this._accumY + this._currentGestureY / this._accumScale;

      // this._offset = (this.props.width - this.props.photo.width) / 2;

      const currentHeight = this.props.photo.height * this._accumScale;
      const currentWidth = this.props.photo.width * this._accumScale;
      const yOffset = (this._accumY - this._initY) * this._accumScale;
      const xOffset = (this._accumX - this._initX) * this._accumScale;
      const initBarVertical = (this.props.height - currentHeight) / 2; // maybe accoutn for scale
      const initBarHorizontal = (this.props.width - currentWidth) / 2;
      const topBar = initBarVertical + yOffset;
      const bottomBar = initBarVertical - yOffset;
      const leftBar = initBarHorizontal + xOffset;
      const rightBar = initBarHorizontal - xOffset;

      console.log({
        accumScale: this._accumScale,
        accumX: this._accumX,
        initX: this._initX,
        leftBar,
        rightBar,
        xOffset,
        initBarHorizontal,
        currentWidth
      });

      if (topBar > 0 && leftBar > 0 && rightBar > 0 && bottomBar > 0) {
        this._accumScale = this._initScale;
        // const horiz = leftBar + rightBar;
        // const vert = topBar + bottomBar;
        // if (horiz > vert) {
        // } else {
        // }
      }

      if (topBar < 0 && bottomBar > 0) {
        this._accumY = this._accumY + bottomBar / this._accumScale;
      } else if (bottomBar < 0 && topBar > 0) {
        this._accumY = this._accumY - topBar / this._accumScale;
      }
      if (leftBar < 0 && rightBar > 0) {
        this._accumX = this._accumX + rightBar / this._accumScale;
      } else if (rightBar < 0 && leftBar > 0) {
        this._accumX = this._accumX - leftBar / this._accumScale;
      }

      // if (topBar > 0 && bottomBar > 0 && topBar !== bottomBar) {
      //   this._accumY = this._accumY - yOffset / this._accumScale;
      // }
      // if (leftBar > 0 && rightBar > 0 && leftBar !== rightBar) {
      //   this._accumX = this._accumX - xOffset / this._accumScale;
      // }

      this._animateTo(this._yOffset, this._accumY);
      this._animateTo(this._xOffset, this._accumX);
      this._animateTo(this._scale, this._accumScale);

      this._currentGestureX = 0;
      this._currentGestureY = 0;
      this._currentPinchScale = 1;
    }
  });
  render() {
    const { photo } = this.props;
    return (
      <View
        style={{ flex: 1, backgroundColor: "black" }}
        {...this._panResponder.panHandlers}
      >
        <Animated.View
          style={{
            transform: [
              { scale: this._scale },
              { translateX: this._xOffset },
              { translateY: this._yOffset }
            ]
          }}
        >
          <Image
            source={photo.source}
            style={{ width: photo.width, height: photo.height }}
          />
        </Animated.View>
      </View>
    );
  }
}
