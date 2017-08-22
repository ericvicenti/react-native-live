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
import PinchView from "./PinchView";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const ANIM_DURATION = 700;

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
      transitionProgress,
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
          opacity: transitionProgress
            ? transitionProgress.interpolate({
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
                ref={i => {
                  this._image = i;
                }}
                source={photo.source}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </Animated.View>
    );
  }
}
// // Pinch to zoom scroll view:
// <ScrollView
//   ref={sv => {
//     this._scrollView = sv;
//   }}
//   horizontal={false}
//   alwaysBounceHorizontal={true}
//   alwaysBounceVertical={true}
//   maximumZoomScale={3}
//   scrollEventThrottle={32}
//   onScroll={e => {
//     const { zoomScale } = e.nativeEvent;
//     if (this._isZooming && zoomScale === 1) {
//       onZoomEnd();
//       this._isZooming = false;
//     } else if (!this._isZooming && zoomScale !== 1) {
//       onZoomStart();
//       this._isZooming = true;
//     }
//   }}
//   style={[StyleSheet.absoluteFill]}
//   showsHorizontalScrollIndicator={false}
//   showsVerticalScrollIndicator={false}
//   centerContent
// >

class InnerViewer extends React.Component {
  state = {
    width: new Animated.Value(SCREEN_WIDTH),
    height: new Animated.Value(SCREEN_HEIGHT),
    overlayOpacity: new Animated.Value(this.props.isOverlayOpen ? 1 : 0),
    openProgress: new Animated.Value(0),
    dismissProgress: null,
    dismissScrollProgress: new Animated.Value(SCREEN_HEIGHT),
    inlineImageMeasurements: null,
    openImageMeasurements: null,
    canScrollHorizontal: true,
    isFirstPass: true
  };
  _isOverlayVisible = this.props.isOverlayOpen;

  componentDidMount() {
    this._setSourceOpacity(this.state.openProgress);
    const openImageMeasurements = this._getDestMeasurements();
    const { measurer } = this.props.getSourceContext(this.props.photoKey);
    measurer().then(measurements => {
      this.setState(
        {
          inlineImageMeasurements: measurements,
          openImageMeasurements
        },
        () => {
          this.setState({ isFirstPass: false });
        }
      );
    });
  }

  _setSourceOpacity(progress) {
    const { setOpacity } = this.props.getSourceContext(this.props.photoKey);
    setOpacity(
      progress.interpolate({
        inputRange: [0.005, 0.01, 0.99, 1],
        outputRange: [1, 0, 0, 1]
      })
    );
  }

  _getDestMeasurements() {
    const { photos, photoKey } = this.props;
    const height = this.state.height.__getValue();
    const width = this.state.width.__getValue();
    const photo = photos.find(p => p.key === photoKey);
    const aspectRatio = photo.width / photo.height;
    const screenAspectRatio = width / height;
    let destWidth = width;
    let destHeight = width / aspectRatio;
    if (aspectRatio - screenAspectRatio < 0) {
      destHeight = height;
      destWidth = height * aspectRatio;
    }
    let destX = (width - destWidth) / 2;
    let destY = (height - destHeight) / 2;
    const openImageMeasurements = {
      width: destWidth,
      height: destHeight,
      x: destX,
      y: destY
    };
    return openImageMeasurements;
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
  _animateOverlayOpacity(isVisible) {
    Animated.timing(this.state.overlayOpacity, {
      toValue: isVisible ? 1 : 0,
      useNativeDriver: true,
      duration: 500
    }).start();
    this._isOverlayVisible = isVisible;
  }
  componentDidUpdate(lastProps, lastState) {
    const { isOverlayOpen } = this.props;
    if (lastProps.isOverlayOpen !== isOverlayOpen) {
      this._animateOverlayOpacity(isOverlayOpen);
      this._isOverlayVisible = isOverlayOpen;
    }
    if (
      !(lastState.inlineImageMeasurements && lastState.openImageMeasurements) &&
      this.state.openImageMeasurements &&
      this.state.inlineImageMeasurements
    ) {
      Animated.timing(this.state.openProgress, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true
      }).start(() => {
        this.onShowOverlay();
        this.setState({
          openProgress: null
        });
      });
    }
  }
  close = async () => {
    this.onHideOverlay();
    const dismissProgress = new Animated.Value(1);
    this._setSourceOpacity(dismissProgress);
    const openImageMeasurements = this._getDestMeasurements();
    const { measurer } = this.props.getSourceContext(this.props.photoKey);
    const inlineImageMeasurements = await measurer();
    this.setState(
      {
        dismissProgress,
        inlineImageMeasurements,
        openImageMeasurements
      },
      () => {
        Animated.timing(dismissProgress, {
          toValue: 0,
          duration: ANIM_DURATION
        }).start(() => {
          this.props.onClose();
        });
      }
    );
  };
  render() {
    const {
      photos,
      photoKey,
      onPhotoKeyChange,
      renderOverlay,
      setOverlay,
      isOverlayOpen
    } = this.props;
    const onClose = this.close;

    let overlay = (
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    );

    const photo = photos.find(p => p.key === photoKey);

    if (renderOverlay) {
      overlay = renderOverlay({ photo, onClose });
    }

    const {
      width,
      height,
      overlayOpacity,
      openProgress,
      inlineImageMeasurements,
      openImageMeasurements,
      dismissScrollProgress,
      canScrollHorizontal,
      dismissProgress,
      isFirstPass
    } = this.state;

    let openingInitScale = 0;
    let openingInitTranslateX = 0;
    let openingInitTranslateY = 0;
    let inlineAspectX = 1;
    let inlineAspectY = 1;
    if (inlineImageMeasurements && openImageMeasurements) {
      const aspectRatio = photo.width / photo.height;
      const screenAspectRatio = width.__getValue() / height.__getValue();
      if (aspectRatio - screenAspectRatio > 0) {
        const maxDim = openImageMeasurements.width;
        const srcShortDim = inlineImageMeasurements.height;
        const srcMaxDim = srcShortDim * aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
        inlineAspectX =
          inlineImageMeasurements.width /
          inlineImageMeasurements.height /
          aspectRatio;
        inlineAspectY = aspectRatio;
      } else {
        const maxDim = openImageMeasurements.height;
        const srcShortDim = inlineImageMeasurements.width;
        const srcMaxDim = srcShortDim / aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
        inlineAspectX = 1 / aspectRatio;
        inlineAspectY =
          aspectRatio *
          inlineImageMeasurements.height /
          inlineImageMeasurements.width;
      }
      const translateInitY =
        inlineImageMeasurements.y + inlineImageMeasurements.height / 2;
      const translateDestY =
        openImageMeasurements.y + openImageMeasurements.height / 2;
      openingInitTranslateY = translateInitY - translateDestY;
      const translateInitX =
        inlineImageMeasurements.x + inlineImageMeasurements.width / 2;
      const translateDestX =
        openImageMeasurements.x + openImageMeasurements.width / 2;
      openingInitTranslateX = translateInitX - translateDestX;
    }

    const outerViewerOpacity = openProgress || 1;
    let innerViewerOpacity = dismissScrollProgress.interpolate({
      inputRange: [0, height.__getValue(), height.__getValue() * 2],
      outputRange: [0, 1, 0]
    });
    if (dismissProgress) {
      innerViewerOpacity = dismissProgress;
    }
    const openCloseProgress = openProgress || dismissProgress;
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
        {!isFirstPass &&
          <Animated.View
            style={[styles.viewer, { opacity: outerViewerOpacity }]}
          >
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "black", opacity: innerViewerOpacity }
              ]}
            />
            {this._renderInnerInner()}
            <Animated.View
              pointerEvents={isOverlayOpen ? "box-none" : "none"}
              style={[{ opacity: overlayOpacity }, StyleSheet.absoluteFill]}
            >
              {overlay}
            </Animated.View>
          </Animated.View>}

        {inlineImageMeasurements &&
          openImageMeasurements &&
          openCloseProgress &&
          <Animated.View
            style={{
              position: "absolute",
              width: openImageMeasurements.width,
              height: openImageMeasurements.height,
              left: openImageMeasurements.x,
              top: openImageMeasurements.y,
              overflow: "hidden",
              transform: [
                {
                  translateX: openCloseProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitTranslateX, 0]
                  })
                },
                {
                  translateY: openCloseProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitTranslateY, 0]
                  })
                },
                {
                  scale: openCloseProgress.interpolate({
                    inputRange: [0.01, 0.99],
                    outputRange: [openingInitScale, 1]
                  })
                },

                {
                  scaleX: openCloseProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [inlineAspectX, 1]
                  })
                },
                {
                  scaleY: openCloseProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [inlineAspectY, 1]
                  })
                }
              ]
            }}
          >
            <Animated.Image
              source={photo.source}
              style={{
                ...StyleSheet.absoluteFillObject,
                opacity: openCloseProgress.interpolate({
                  inputRange: [0, 0.005, 0.995, 1],
                  outputRange: [0, 1, 1, 0]
                }),
                backgroundColor: "white",
                transform: [
                  {
                    scaleX: openCloseProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1 / inlineAspectX, 1]
                    })
                  },
                  {
                    scaleY: openCloseProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1 / inlineAspectY, 1]
                    })
                  }
                ]
              }}
            />
          </Animated.View>}
      </Animated.View>
    );
  }
  _renderInnerInner() {
    const { photos, photoKey, onPhotoKeyChange } = this.props;
    const { width, height } = this.state;
    const photo = photos.find(p => p.key === photoKey);
    return (
      <Animated.ScrollView
        pagingEnabled={true}
        scrollEventThrottle={1}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: { y: this.state.dismissScrollProgress }
              }
            }
          ],
          {
            useNativeDriver: true,
            listener: value => {
              const yOffset = value.nativeEvent.contentOffset.y;
              const heightValue = height.__getValue();
              if (yOffset <= 0 || yOffset >= 2 * heightValue) {
                this.props.onClose();
              }
              if (yOffset === heightValue) {
                if (!this._isOverlayVisible && this.props.isOverlayOpen) {
                  this._animateOverlayOpacity(true);
                }
              } else if (this._isOverlayVisible) {
                this._animateOverlayOpacity(false);
              }
            }
          }
        )}
        contentOffset={{ x: 0, y: height.__getValue() }}
      >
        <Animated.View style={{ width, height }} />
        {this._renderFlatList()}
        <Animated.View style={{ width, height }} />
      </Animated.ScrollView>
    );
  }
  _renderFlatList() {
    const {
      openProgress,
      dismissProgress,
      canScrollHorizontal,
      width,
      height
    } = this.state;
    const { photos, photoKey, onPhotoKeyChange } = this.props;
    const photo = photos.find(p => p.key === photoKey);
    const initialIndex = photos.findIndex(p => p.key === photoKey);
    const transitionProgress = openProgress || dismissProgress;
    return (
      <FlatList
        scrollEnabled={!transitionProgress && canScrollHorizontal}
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
          if (!transitionProgress && item && item.key !== photoKey) {
            onPhotoKeyChange(item.key);
          }
        }}
        renderItem={({ item }) => {
          return (
            <PhotoPane
              onZoomEnd={this._onZoomEnd}
              onZoomStart={this._onZoomStart}
              transitionProgress={transitionProgress}
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
  componentWillMount() {
    const { photo } = this.props;
    this.context.onSourceContext(photo.key, this.measure, this.setOpacity);
  }
  setOpacity = opacity => {
    this.setState({ opacity });
  };
  measure = async () => {
    if (!this._imageRef && !this._readyToMeasure) {
      console.error("measuring before its ready!");
    }
    return new Promise((resolve, reject) => {
      this._imageRef
        .getNode()
        .measure((imgX, imgY, imgWidth, imgHeight, imgPageX, imgPageY) => {
          resolve({
            width: imgWidth,
            height: imgHeight,
            x: imgPageX,
            y: imgPageY
          });
        }, reject);
    });
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
          this._imageRef = i;
        }}
        onLayout={() => {
          this._readyToMeasure = true;
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

  _imageMeasurers: { [key: string]: () => void } = {};
  _imageOpacitySetters: {
    [key: string]: (opacity: Animated.Value) => void
  } = {};

  static childContextTypes = {
    onSourceContext: PropTypes.func
  };

  getChildContext() {
    return { onSourceContext: this._onSourceContext };
  }

  _onSourceContext = (key, imageMeasurer, setOpacity) => {
    this._imageMeasurers[key] = imageMeasurer;
    this._imageOpacitySetters[key] = setOpacity;
  };

  _getSourceContext = (key: string) => {
    return {
      measurer: this._imageMeasurers[key],
      setOpacity: this._imageOpacitySetters[key]
    };
  };

  open = (photos, key) => {
    this.setState(() => ({ photos, key, isOverlayOpen: false }));
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
            getSourceContext={this._getSourceContext}
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
    backgroundColor: "transparent"
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
