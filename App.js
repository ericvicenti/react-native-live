import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
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
    key: "second",
    width: 200,
    height: 1000,
    source: { uri: "https://placebear.com/200/1000", cache: "force-cache" },
    caption: "Grizzly"
  },
  {
    key: "third",
    width: 300,
    height: 50,
    source: { uri: "https://placebear.com/300/50", cache: "force-cache" },
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

const FEED_ITEMS = [
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

export default class App extends React.Component {
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
