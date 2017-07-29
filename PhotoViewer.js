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
  _handlePhotoTap = () => {
    const { width, height, onToggleOverlay } = this.props;
    this._scrollView &&
      this._scrollView.scrollResponderZoomTo({
        x: 0,
        y: 0,
        width: width.__getValue(),
        height: height.__getValue()
      });
    onToggleOverlay();
  };
  render() {
    const { photo, width, height, onToggleOverlay, onImageRef } = this.props;
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
          style={[StyleSheet.absoluteFill]}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
        >
          <Animated.View
            style={{
              width,
              height,
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <TouchableWithoutFeedback onPress={this._handlePhotoTap}>
              <Animated.Image
                style={{
                  width: photoSize.width,
                  height: photoSize.height
                }}
                ref={onImageRef}
                source={photo.source}
              />
            </TouchableWithoutFeedback>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    );
  }
}

class InnerViewer extends React.Component {
  state = {
    width: new Animated.Value(SCREEN_WIDTH),
    height: new Animated.Value(SCREEN_HEIGHT),
    overlayOpacity: new Animated.Value(this.props.isOverlayOpen ? 1 : 0)
  };

  _openingImageRef: ?Image = null;

  componentDidMount() {
    setTimeout(() => {
      this._openingImageRef
        .getNode()
        .measure(
          (destX, destY, destWidth, destHeight, destPageX, destPageY) => {
            this.props.sourceImageRef.measure(
              (
                sourceX,
                sourceY,
                sourceWidth,
                sourceHeight,
                sourcePageX,
                sourcePageY
              ) => {
                console.log({
                  destX,
                  destY,
                  destWidth,
                  destHeight,
                  sourceX,
                  sourceY,
                  sourceWidth,
                  sourceHeight,
                  destPageX,
                  destPageY,
                  sourcePageX,
                  sourcePageY
                });

                console.log(!!this.props.sourceImageRef);
              },
              console.error
            );
          },
          console.error
        );
    });
  }

  onToggleOverlay = () => {
    this.props.setOverlay(!this.props.isOverlayOpen);
  };

  componentDidUpdate(lastProps) {
    if (lastProps.isOverlayOpen !== this.props.isOverlayOpen) {
      Animated.timing(this.state.overlayOpacity, {
        toValue: this.props.isOverlayOpen ? 1 : 0
      }).start();
    }
  }

  render() {
    const {
      onClose,
      photos,
      photoKey,
      onPhotoKeyChange,
      renderOverlay,
      setOverlay
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
    const { width, height, overlayOpacity } = this.state;
    return (
      <Animated.View
        style={[styles.viewer, { opacity: 0 }]}
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
              if (this.flatList && initialIndex != null) {
                this.flatList.scrollToIndex({
                  index: initialIndex,
                  viewPosition: 0
                });
              }
            }
          }
        )}
      >
        <FlatList
          scrollEnabled={false}
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
                onToggleOverlay={this.onToggleOverlay}
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
          pointerEvents="box-none"
          style={[{ opacity: overlayOpacity }, StyleSheet.absoluteFill]}
        >
          {overlay}
        </Animated.View>
      </Animated.View>
    );
  }
}

class PhotoViewerPhoto extends React.Component {
  static contextTypes = {
    onImageRef: PropTypes.func
  };
  render() {
    const { style, photo } = this.props;
    return (
      <Image
        style={style}
        source={photo.source}
        ref={i => {
          this.context.onImageRef(photo.key, i);
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
    isOverlayOpen: true
  };

  _images: { [key: string]: Image } = {};

  static childContextTypes = {
    onImageRef: PropTypes.func
  };

  getChildContext() {
    return { onImageRef: this._onImageRef };
  }

  _onImageRef = (key, imageRef) => {
    this._images[key] = imageRef;
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
  hScroll: { flex: 1 }
});
