import React from "react";
import PropTypes from "prop-types";
import ReactNative, {
  Animated,
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TouchableWithoutFeedback
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

class PhotoPane extends React.Component {
  _isZooming: boolean = false;
  _doubleTapTimeout: ?number = null;
  _handlePaneTap = e => {
    const {
      width,
      height,
      onHideOverlay,
      onShowOverlay,
      onToggleOverlay
    } = this.props;
    const { nativeEvent } = e;
    if (this._doubleTapTimeout) {
      clearTimeout(this._doubleTapTimeout);
      this._doubleTapTimeout = null;
      if (this._isZooming) {
        onShowOverlay();
        this._scrollView.scrollResponderZoomTo({
          x: 0,
          y: 0,
          width: width.__getValue(),
          height: height.__getValue()
        });
      } else {
        // todo: zoom in on nativeEvent.pageX/Y
        onHideOverlay();
        this._scrollView.scrollResponderZoomTo({
          x: width.__getValue() / 4,
          y: height.__getValue() / 4,
          width: width.__getValue() / 2,
          height: height.__getValue() / 2
        });
      }
      return;
    }
    this._doubleTapTimeout = setTimeout(() => {
      this._doubleTapTimeout = null;
      if (this._isZooming) {
        this._scrollView &&
          this._scrollView.scrollResponderZoomTo({
            x: 0,
            y: 0,
            width: width.__getValue(),
            height: height.__getValue()
          });
        onShowOverlay();
      } else {
        onToggleOverlay();
      }
    }, 270);
  };
  render() {
    const {
      photo,
      width,
      height,
      onImageRef,
      openProgress,
      onZoomEnd,
      onZoomStart
    } = this.props;
    const aspectRatio = photo.width / photo.height;
    const maxWidth = width.__getValue();
    const maxHeight = height.__getValue();
    const screenAspectRatio = maxWidth / maxHeight;
    let photoSize = null;
    if (aspectRatio > screenAspectRatio) {
      photoSize = { width: maxWidth, height: maxWidth / aspectRatio };
    } else {
      photoSize = { height: maxHeight, width: maxHeight * aspectRatio };
    }
    return (
      <Animated.View
        style={{
          opacity: openProgress
            ? openProgress.interpolate({
                inputRange: [0, 0.99, 0.995],
                outputRange: [0, 0, 1]
              })
            : 1
        }}
      >
        <Animated.View
          style={[
            styles.innerPane,
            {
              width,
              height
            }
          ]}
        >
          <ScrollView
            ref={sv => {
              this._scrollView = sv;
            }}
            horizontal={true}
            alwaysBounceHorizontal={true}
            alwaysBounceVertical={true}
            maximumZoomScale={3}
            scrollEventThrottle={32}
            onScroll={e => {
              const { zoomScale } = e.nativeEvent;
              if (this._isZooming && zoomScale === 1) {
                onZoomEnd();
                this._isZooming = false;
              } else if (!this._isZooming && zoomScale !== 1) {
                onZoomStart();
                this._isZooming = true;
              }
            }}
            style={[StyleSheet.absoluteFill]}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <TouchableWithoutFeedback onPress={this._handlePaneTap}>
              <Animated.View
                style={{
                  width,
                  height,
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Animated.Image
                  style={{
                    width: photoSize.width,
                    height: photoSize.height
                  }}
                  ref={onImageRef}
                  source={photo.source}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    );
  }
}

class InnerViewer extends React.Component {
  state = {
    width: new Animated.Value(SCREEN_WIDTH),
    height: new Animated.Value(SCREEN_HEIGHT),
    overlayOpacity: new Animated.Value(this.props.isOverlayOpen ? 1 : 0),
    openProgress: new Animated.Value(0),
    openMeasurements: null,
    canScrollHorizontal: true
  };

  _openingImageRef: ?Image = null;

  componentDidMount() {
    this.props.sourceImageOpacitySetter(
      this.state.openProgress.interpolate({
        inputRange: [0.005, 0.01, 0.99, 1],
        outputRange: [1, 0, 0, 1]
      })
    );
    setTimeout(() => {
      this._openingImageRef
        .getNode()
        .measure(
          (destX, destY, destWidth, destHeight, destPageX, destPageY) => {
            this.props.sourceImageRef
              .getNode()
              .measure(
                (
                  sourceX,
                  sourceY,
                  sourceWidth,
                  sourceHeight,
                  sourcePageX,
                  sourcePageY
                ) => {
                  this.setState({
                    openMeasurements: {
                      destWidth,
                      destHeight,
                      sourceWidth,
                      sourceHeight,
                      destPageX,
                      destPageY,
                      sourcePageX,
                      sourcePageY
                    }
                  });
                },
                console.error
              );
          },
          console.error
        );
    });
  }

  onShowOverlay = () => {
    this.props.setOverlay(true);
  };
  onHideOverlay = () => {
    this.props.setOverlay(false);
  };
  onToggleOverlay = () => {
    this.props.setOverlay(!this.props.isOverlayOpen);
  };
  _onZoomStart = () => {
    this.setState({ canScrollHorizontal: false });
  };
  _onZoomEnd = () => {
    this.setState({ canScrollHorizontal: true });
  };
  componentDidUpdate(lastProps, lastState) {
    if (lastProps.isOverlayOpen !== this.props.isOverlayOpen) {
      Animated.timing(this.state.overlayOpacity, {
        toValue: this.props.isOverlayOpen ? 1 : 0
      }).start();
    }
    if (!lastState.openMeasurements && this.state.openMeasurements) {
      Animated.timing(this.state.openProgress, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start(() => {
        this.setState({
          openProgress: null
        });
      });
    }
  }

  render() {
    const {
      onClose,
      photos,
      photoKey,
      onPhotoKeyChange,
      renderOverlay,
      setOverlay,
      isOverlayOpen
    } = this.props;

    let overlay = (
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    );

    const photo = photos.find(p => p.key === photoKey);

    if (renderOverlay) {
      overlay = renderOverlay({ photo, onClose });
    }

    const initialIndex = photos.findIndex(p => p.key === photoKey);
    const {
      width,
      height,
      overlayOpacity,
      openProgress,
      openMeasurements,
      canScrollHorizontal
    } = this.state;

    let openingInitScale = 0;
    let openingInitTranslateX = 0;
    let openingInitTranslateY = 0;
    if (openMeasurements) {
      const aspectRatio = photo.width / photo.height;
      const screenAspectRatio = width.__getValue() / height.__getValue();
      if (aspectRatio - screenAspectRatio > 0) {
        const maxDim = openMeasurements.destWidth;
        const srcShortDim = openMeasurements.sourceHeight;
        const srcMaxDim = srcShortDim * aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
      } else {
        const maxDim = openMeasurements.destHeight;
        const srcShortDim = openMeasurements.sourceWidth;
        const srcMaxDim = srcShortDim / aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
      }
      const translateInitY =
        openMeasurements.sourcePageY + openMeasurements.sourceHeight / 2;
      const translateDestY =
        openMeasurements.destPageY + openMeasurements.destHeight / 2;
      openingInitTranslateY = translateInitY - translateDestY;
      const translateInitX =
        openMeasurements.sourcePageX + openMeasurements.sourceWidth / 2;
      const translateDestX =
        openMeasurements.destPageX + openMeasurements.destWidth / 2;
      openingInitTranslateX = translateInitX - translateDestX;
    }

    return (
      <Animated.View
        style={[styles.outerViewer]}
        onLayout={Animated.event(
          [
            {
              nativeEvent: {
                layout: { width, height }
              }
            }
          ],
          {
            listener: e => {
              // todo: this is needed for re-orienting, but causes bugs
              /* if (this.flatList && initialIndex != null) {
                this.flatList.scrollToIndex({
                  index: initialIndex,
                  viewPosition: 0
                });
              } */
            }
          }
        )}
      >
        <Animated.View style={[styles.viewer, { opacity: openProgress }]}>
          <FlatList
            scrollEnabled={!openProgress && canScrollHorizontal}
            ref={fl => {
              this.flatList = fl;
            }}
            style={styles.hScroll}
            horizontal={true}
            pagingEnabled={true}
            data={photos}
            initialNumToRender={1}
            onViewableItemsChanged={({ viewableItems }) => {
              const item = viewableItems[0];
              if (item && item.key !== photoKey) {
                onPhotoKeyChange(item.key);
              }
            }}
            renderItem={({ item }) => {
              return (
                <PhotoPane
                  onImageRef={i => {
                    if (item === photo) {
                      this._openingImageRef = i;
                    }
                  }}
                  onZoomEnd={this._onZoomEnd}
                  onZoomStart={this._onZoomStart}
                  openProgress={openProgress}
                  onToggleOverlay={this.onToggleOverlay}
                  onShowOverlay={this.onShowOverlay}
                  onHideOverlay={this.onHideOverlay}
                  photo={item}
                  width={width}
                  height={height}
                />
              );
            }}
            getItemLayout={(data, index) => ({
              length: width.__getValue(),
              index,
              offset: index * width.__getValue()
            })}
            initialScrollIndex={initialIndex}
          />
          <Animated.View
            pointerEvents={isOverlayOpen ? "box-none" : "none"}
            style={[{ opacity: overlayOpacity }, StyleSheet.absoluteFill]}
          >
            {overlay}
          </Animated.View>
        </Animated.View>

        {openMeasurements &&
          openProgress &&
          <Animated.Image
            source={photo.source}
            style={{
              opacity: openProgress.interpolate({
                inputRange: [0, 0.005, 0.995, 1],
                outputRange: [0, 1, 1, 0]
              }),
              position: "absolute",
              backgroundColor: "green",
              width: openMeasurements.destWidth,
              height: openMeasurements.destHeight,
              left: openMeasurements.destPageX,
              top: openMeasurements.destPageY,
              transform: [
                {
                  translateX: openProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitTranslateX, 0]
                  })
                },
                {
                  translateY: openProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitTranslateY, 0]
                  })
                },
                {
                  scale: openProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitScale, 1]
                  })
                }
              ]
            }}
          />}
      </Animated.View>
    );
  }
}

class PhotoViewerPhoto extends React.Component {
  state = {
    opacity: new Animated.Value(1)
  };
  static contextTypes = {
    onSourceContext: PropTypes.func
  };
  setOpacity = opacity => {
    this.setState({ opacity });
  };
  render() {
    const { style, photo } = this.props;
    const { opacity } = this.state;
    return (
      <Animated.Image
        style={[style, { opacity }]}
        resizeMode="cover"
        source={photo.source}
        ref={i => {
          this.context.onSourceContext(photo.key, i, this.setOpacity);
        }}
      />
    );
  }
}

type PhotoSource = { uri: string, cache: "force-cache" };

type Photo = {
  key: string,
  width: number,
  height: number,
  source: PhotoSource
};

export default class PhotoViewer extends React.Component {
  static Photo = PhotoViewerPhoto;

  state = {
    photos: null,
    key: null,
    isOverlayOpen: false
  };

  _images: { [key: string]: Image } = {};
  _imageOpacitySetters: {
    [key: string]: (opacity: Animated.Value) => void
  } = {};

  static childContextTypes = {
    onSourceContext: PropTypes.func
  };

  getChildContext() {
    return { onSourceContext: this._onSourceContext };
  }

  _onSourceContext = (key, imageRef, setOpacity) => {
    this._images[key] = imageRef;
    this._imageOpacitySetters[key] = setOpacity;
  };

  open = (photos, key) => {
    this.setState({ photos, key });
  };

  close = () => {
    this.setState({ photos: null, key: null });
  };

  changePhoto = key => {
    this.setState({ key });
  };

  setOverlay = isOverlayOpen => {
    this.setState({ isOverlayOpen });
  };

  render() {
    const { photos, key, isOverlayOpen } = this.state;
    const { renderOverlay } = this.props;
    return (
      <View style={{ flex: 1 }}>
        {this.props.renderContent({ onPhotoOpen: this.open })}
        {photos &&
          <InnerViewer
            photos={photos}
            photoKey={key}
            sourceImageRef={this._images[key]}
            sourceImageOpacitySetter={this._imageOpacitySetters[key]}
            onClose={this.close}
            renderOverlay={renderOverlay}
            isOverlayOpen={isOverlayOpen}
            setOverlay={this.setOverlay}
            onPhotoKeyChange={this.changePhoto}
          />}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  closeText: { color: "white", backgroundColor: "transparent" },
  closeButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    position: "absolute",
    top: 20,
    left: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "white",
    borderRadius: 5
  },
  viewer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "black"
  },
  closeButtonWrapper: {
    flex: 1
  },
  innerPane: {
    justifyContent: "center",
    alignItems: "center"
  },
  hScroll: { flex: 1 },
  outerViewer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  }
});
