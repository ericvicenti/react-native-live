import React from "react";
import {
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
    const { photo, width, height, onToggleOverlay } = this.props;
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
          style={StyleSheet.absoluteFill}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
        >
          <TouchableWithoutFeedback onPress={this._handlePhotoTap}>
            <Animated.Image
              style={{
                width,
                height
              }}
              source={photo.source}
              resizeMode="contain"
            />
          </TouchableWithoutFeedback>
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
        style={styles.viewer}
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
  render() {
    const { style, photo } = this.props;
    return <Image style={style} source={photo.source} />;
  }
}

export default class PhotoViewer extends React.Component {
  static Photo = PhotoViewerPhoto;

  state = {
    photos: null,
    key: null,
    isOverlayOpen: true
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
    borderWidth: 1,
    borderColor: "white",
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
