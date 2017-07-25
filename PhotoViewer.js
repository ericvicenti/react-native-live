import React from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  TouchableWithoutFeedback
} from "react-native";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

const PhotoPane = ({ photo, width, height }) =>
  <Animated.View
    style={[
      styles.innerPane,
      {
        width,
        height
      }
    ]}
  >
    <Animated.Image
      style={{ width, height }}
      source={photo.source}
      resizeMode="contain"
    />
  </Animated.View>;

class InnerViewer extends React.Component {
  state = {
    width: new Animated.Value(SCREEN_WIDTH),
    height: new Animated.Value(SCREEN_HEIGHT)
  };
  render() {
    const { onClose, photos, photoKey, onPhotoKeyChange } = this.props;
    const initialIndex = photos.findIndex(p => p.key === photoKey);
    const { width, height } = this.state;
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
        {/* onLayout={e => {
          console.log({ ...e.nativeEvent.layout.height });
        }} */}
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
            return <PhotoPane photo={item} width={width} height={height} />;
          }}
          getItemLayout={(data, index) => ({
            length: width.__getValue(),
            index,
            offset: index * width.__getValue()
          })}
          initialScrollIndex={initialIndex}
        />
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

export default class PhotoViewer extends React.Component {
  state = {
    photos: null
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
  render() {
    const { photos, key } = this.state;

    return (
      <View style={{ flex: 1 }}>
        {this.props.renderContent({ onPhotoOpen: this.open })}
        {photos &&
          <InnerViewer
            photos={photos}
            photoKey={key}
            onClose={this.close}
            onPhotoKeyChange={this.changePhoto}
          />}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  closeText: { color: "white" },
  closeButton: {
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
