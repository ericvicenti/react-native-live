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
      onImageLayout,
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
            horizontal={false}
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
                  ref={i => {
                    this._image = i;
                  }}
                  onLayout={() => {
                    this._image &&
                      this._image
                        .getNode()
                        .measure((x, y, width, height, pageX, pageY) => {
                          onImageLayout({
                            width,
                            height,
                            x: pageX,
                            y: pageY
                          });
                        });
                  }}
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
    srcImageMeasurements: null,
    destImageMeasurements: null,
    canScrollHorizontal: true
  };

  componentDidMount() {
    const { setOpacity, measurer } = this.props.getSourceContext(
      this.props.photoKey
    );
    setOpacity(
      this.state.openProgress.interpolate({
        inputRange: [0.005, 0.01, 0.99, 1],
        outputRange: [1, 0, 0, 1]
      })
    );
    const { photos, photoKey } = this.props;
    const height = this.state.height.__getValue();
    const width = this.state.width.__getValue();
    const photo = photos.find(p => p.key === photoKey);
    const aspectRatio = photo.width / photo.height;
    const screenAspectRatio = width / height;
    let destWidth = width;
    let destHeight = width / aspectRatio;
    let destX = 0;
    let destY = (height - photo.height) / 2;
    if (aspectRatio - screenAspectRatio < 0) {
      destHeight = height;
      destWidth = height * aspectRatio;
      destY = 0;
      destX = (width - photo.width) / 2;
    }
    const destImageMeasurements = {
      width: destWidth,
      height: destHeight,
      x: destX,
      y: destY
    };
    console.log("computed layout", destImageMeasurements);
    const srcMeasured = measurer().then(measurements => {
      this.setState({
        srcImageMeasurements: measurements,
        destImageMeasurements
      });
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
    if (
      !(lastState.srcImageMeasurements && lastState.destImageMeasurements) &&
      this.state.destImageMeasurements &&
      this.state.srcImageMeasurements
    ) {
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
      srcImageMeasurements,
      destImageMeasurements,
      canScrollHorizontal
    } = this.state;

    let openingInitScale = 0;
    let openingInitTranslateX = 0;
    let openingInitTranslateY = 0;
    if (srcImageMeasurements && destImageMeasurements) {
      const aspectRatio = photo.width / photo.height;
      const screenAspectRatio = width.__getValue() / height.__getValue();
      if (aspectRatio - screenAspectRatio > 0) {
        const maxDim = destImageMeasurements.width;
        const srcShortDim = srcImageMeasurements.height;
        const srcMaxDim = srcShortDim * aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
      } else {
        const maxDim = destImageMeasurements.height;
        const srcShortDim = srcImageMeasurements.width;
        const srcMaxDim = srcShortDim / aspectRatio;
        openingInitScale = srcMaxDim / maxDim;
      }
      const translateInitY =
        srcImageMeasurements.y + srcImageMeasurements.height / 2;
      const translateDestY =
        destImageMeasurements.y + destImageMeasurements.height / 2;
      openingInitTranslateY = translateInitY - translateDestY;
      const translateInitX =
        srcImageMeasurements.x + srcImageMeasurements.width / 2;
      const translateDestX =
        destImageMeasurements.x + destImageMeasurements.width / 2;
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
          <ScrollView>
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
                if (!openProgress && item && item.key !== photoKey) {
                  onPhotoKeyChange(item.key);
                }
              }}
              renderItem={({ item }) => {
                return (
                  <PhotoPane
                    onImageLayout={imageMeasurements => {
                      item === photo &&
                        console.log("measured layout", imageMeasurements);
                      if (item === photo && !destImageMeasurements) {
                        /* this.setState({
                          destImageMeasurements: imageMeasurements
                        }); */
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
          </ScrollView>
          <Animated.View
            pointerEvents={isOverlayOpen ? "box-none" : "none"}
            style={[{ opacity: overlayOpacity }, StyleSheet.absoluteFill]}
          >
            {overlay}
          </Animated.View>
        </Animated.View>

        {srcImageMeasurements &&
          destImageMeasurements &&
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
              width: destImageMeasurements.width,
              height: destImageMeasurements.height,
              left: destImageMeasurements.x,
              top: destImageMeasurements.y,
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
    this.setState(() => ({ photos, key }));
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
