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
import PhotoViewer from "./PhotoViewer";

const TouchableWithoutFeedbackForCompositeComponents = ({
  onPress,
  children
}) =>
  <TouchableWithoutFeedback onPress={onPress}>
    <View style={{ flex: 1 }}>
      {children}
    </View>
  </TouchableWithoutFeedback>;

const MAIN_PHOTOS = [
  {
    key: "first",
    width: 300,
    height: 200,
    source: { uri: "https://placebear.com/200/300", cache: "force-cache" },
    caption: "Grizzly"
  },

  {
    key: "third",
    width: 300,
    height: 50,
    source: { uri: "https://placebear.com/300/50", cache: "force-cache" },
    caption: "Grizzly"
  },
  {
    key: "second",
    width: 200,
    height: 1000,
    source: { uri: "https://placebear.com/200/1000", cache: "force-cache" },
    caption: "Grizzly"
  }
];
const EXTRA_PHOTOS = [
  {
    key: "extra-1",
    width: 200,
    height: 200,
    source: { uri: "https://placebear.com/200/201", cache: "force-cache" }
  },
  {
    key: "extra-2",
    width: 200,
    height: 200,
    source: { uri: "https://placebear.com/200/200", cache: "force-cache" }
  }
];
const EXTRA_PHOTO = {
  key: "extra-3",
  width: 600,
  height: 600,
  source: { uri: "https://placebear.com/600/600", cache: "force-cache" }
};

const FEED_ITEMS = [
  {
    key: "single",
    caption: "single bear",
    photos: [EXTRA_PHOTO]
  },
  ...MAIN_PHOTOS,
  {
    key: "two",
    caption: "two grizzlies",
    photos: EXTRA_PHOTOS
  }
];

class BearOverlay extends React.Component {
  render() {
    const { photo, onClose } = this.props;
    return (
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { backgroundColor: "transparent" }]}
      >
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <View style={styles.overlayButtons}>
          <TouchableOpacity onPress={() => {}} style={styles.button}>
            <Text style={styles.buttonText}>
              Scary {photo.key}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => {}} style={styles.button}>
            <Text style={styles.buttonText}>
              Cuddly {photo.key}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const Item = ({ item, mainPhotos, onPhotoOpen }) =>
  <View style={styles.item}>
    {item.photos
      ? <View style={{ flexDirection: "row", width: 300, height: 300 }}>
          {item.photos.map(innerPhoto =>
            <TouchableWithoutFeedbackForCompositeComponents
              key={innerPhoto.key}
              onPress={() => onPhotoOpen(item.photos, innerPhoto.key)}
            >
              <PhotoViewer.Photo style={{ flex: 1 }} photo={innerPhoto} />
            </TouchableWithoutFeedbackForCompositeComponents>
          )}
        </View>
      : <TouchableWithoutFeedbackForCompositeComponents
          onPress={() => onPhotoOpen(mainPhotos, item.key)}
        >
          <PhotoViewer.Photo style={{ width: 300, height: 300 }} photo={item} />
        </TouchableWithoutFeedbackForCompositeComponents>}
    <Text style={styles.caption}>
      {item.caption}
    </Text>
  </View>;

class PApp extends React.Component {
  render() {
    return (
      <PhotoViewer
        renderOverlay={({ photo, onClose }) =>
          <BearOverlay photo={photo} onClose={onClose} />}
        renderContent={({ onPhotoOpen }) =>
          <ScrollView style={styles.container}>
            {FEED_ITEMS.map(feedItem =>
              <Item
                key={feedItem.key}
                item={feedItem}
                mainPhotos={MAIN_PHOTOS}
                onPhotoOpen={onPhotoOpen}
              />
            )}
          </ScrollView>}
      />
    );
  }
}

class PinchToZoom extends React.Component {
  _screenAspectRatio = this.props.width / this.props.height;
  _photoAspectRatio = this.props.photo.width / this.props.photo.height;
  _isWidePhoto = this._screenAspectRatio < this._photoAspectRatio;

  // current photo state
  _accumScale = this._isWidePhoto
    ? this.props.width / this.props.photo.width
    : this.props.height / this.props.photo.height;
  _accumX = (this.props.width - this.props.photo.width) / 2;
  _accumY = (this.props.height - this.props.photo.height) / 2;

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
      this._accumX = this._accumX + this._currentGestureX;
      this._accumY = this._accumY + this._currentGestureY;
      this._accumScale = this._accumScale * this._currentPinchScale;
      console.log(this._accumScale, this._currentPinchScale);

      // this._offset = (this.props.width - this.props.photo.width) / 2;

      const a = this._accumX + this.props.photo.width / 2;

      this._currentGestureX = 0;
      this._currentGestureY = 0;
      this._currentPinchScale = 1;
    }
  });
  render() {
    console.log({
      photo: this._photoAspectRatio,
      screen: this._screenAspectRatio
    });
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

class App extends React.Component {
  render() {
    const { width, height } = Dimensions.get("window");
    return <PinchToZoom photo={EXTRA_PHOTO} width={width} height={height} />;
  }
}

module.exports = App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff"
  },
  item: {
    padding: 20,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#333",
    alignItems: "center"
  },
  closeText: { color: "white", backgroundColor: "transparent" },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "absolute",
    top: 20,
    left: 20,
    borderWidth: 1,
    borderColor: "white",
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "white",
    borderRadius: 5
  },
  overlayButtons: {
    position: "absolute",
    left: 0,
    bottom: 0,
    right: 0,
    height: 50,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "white",
    flexDirection: "row"
  },
  button: { flex: 1, alignItems: "center", justifyContent: "center" },
  buttonText: {
    color: "white",
    backgroundColor: "transparent",
    fontSize: 20,
    fontWeight: "600"
  }
});
