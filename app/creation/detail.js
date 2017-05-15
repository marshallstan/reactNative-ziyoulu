var React = require('react');
import Icon from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import Button from 'react-native-button';
var ReactNative = require('react-native');
var request = require('../common/request');
var config = require('../common/config');
var util = require('../common/util');
var {
  StyleSheet,
  Text,
  View,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  ListView,
  TextInput,
  Modal,
  AlertIOS,
  AsyncStorage
} = ReactNative;
var width = Dimensions.get('window').width;
var cachedResults = {
  nextPage: 1,
  items: [],
  total: 0
};

var Detail = React.createClass({
  getInitialState: function () {
    var data = this.props.data;
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    return {
      data: data,
      //comments
      dataSource: ds.cloneWithRows([]),
      noComments: false,
      //video loads
      videoOk: true,
      videoLoaded: false,
      playing: false,
      paused: false,
      videoProgress: 0.01,
      videoTotal: 0,
      currentTime: 0,
      //modal
      content: '',
      animationType: 'none',
      modalVisible: false,
      isSending: false,
      //video player
      rate: 1,
      muted: false,
      resizeMode: 'contain',
      repeat: false
    };
  },
  _pop: function () {
    this.setState({
      noComments: false,
      dataSource: this.state.dataSource.cloneWithRows([])
    });
    cachedResults = {
      nextPage: 1,
      items: [],
      total: 0
    };
    this.props.navigator.pop();
  },
  _onLoadStart: function() {

  },
  _onLoad: function() {

  },
  _onProgress: function(data) {
    if (data.currentTime <= data.playableDuration) {
      if (!this.state.videoLoaded) {
        this.setState({
          videoLoaded: true
        });
      }
      var duration = data.playableDuration;
      var currentTime = data.currentTime;
      var percent = Number((currentTime/duration).toFixed(2));
      var newState = {
        videoTotal: duration,
        currentTime: Number(data.currentTime.toFixed(2)),
        videoProgress: percent
      };
      if (!this.state.videoLoaded) {
        newState.videoLoaded = true
      }
      if (!this.state.playing) {
        newState.playing = true
      }
      this.setState(newState);
    }
  },
  _onEnd: function () {
    this.setState({
      videoProgress: 1,
      playing: false
    });
  },
  _onError: function(err) {
    console.log(err);
    this.setState({
      videoOk: false
    });
  },
  _rePlay: function () {
    this.refs.videoPlayer.seek(0);
  },
  _pause: function () {
    if (!this.state.paused) {
      this.setState({
        paused: true
      });
    }
  },
  _resume: function () {
    if (this.state.paused) {
      this.setState({
        paused: false
      });
    }
  },
  componentDidMount: function () {
    var that = this;
    AsyncStorage.getItem('user')
      .then((data) => {
        var user;
        if(data){
          user = JSON.parse(data);
        }
        if(user && user.accessToken){
          that.setState({
            user: user
          }, function () {
            that._fetchData();
          });
        }
      });
  },
  _fetchData: function (page) {
    var that = this;
    this.setState({
      isLoadingTail: true
    });

    request.get(config.api.base + config.api.comment, {
      page: page,
      creation: this.state.data._id,
      accessToken: this.state.user.accessToken
    })
      .then((data) => {
        if (data && data.success) {
          if (data.data.length > 0) {
            var items = cachedResults.items.slice();
            items = items.concat(data.data);
            cachedResults.nextPage += 1;
            cachedResults.items = items;
            cachedResults.total = data.total;
            that.setState({
              noComments: false,
              isLoadingTail: false,
              dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
            });
          } else if (data.data.length === 0) {
            if (cachedResults.items.length === 0 ) {
              that.setState({
                noComments: true
              });
            }
          }
        }
      })
      .catch((error) => {
        this.setState({
          isLoadingTail: false
        });
        console.warn(error);
      });
  },
  _hasMore: function () {
    return cachedResults.items.length !== cachedResults.total;
  },
  _fetchMoreData: function () {
    console.log(cachedResults);
    if (!this._hasMore() || this.state.isLoadingTail) {
      return;
    }
    var page = cachedResults.nextPage;
    this._fetchData(page);
  },
  _renderFooter: function () {
    if (!this._hasMore() && cachedResults.total !== 0) {
      return (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}>没有更多了！</Text>
        </View>
      );
    }
    if (this.state.noComments) {
      return (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}>暂无评论！</Text>
        </View>
      );
    }
    if (!this.state.isLoadingTail) {
      return <View style={styles.loadingMore} />;
    }
    return <ActivityIndicator style={styles.loadingMore} />;
  },
  _renderRow: function(row) {
    return (
      <View key={row._id} style={styles.replyBox}>
        <Image style={styles.replyAvatar} source={{uri: util.avatar(row.replyBy.avatar)}} />
        <View style={styles.reply}>
          <Text style={styles.replyNickname}>{row.replyBy.nickname}</Text>
          <Text style={styles.replyContent}>{row.content}</Text>
        </View>
      </View>
    );
  },
  _focus: function () {
    this._setModalVisible(true);
  },
  _closeModal: function () {
    this._setModalVisible(false);
  },
  _setModalVisible: function (isVisible) {
    this.setState({
      modalVisible: isVisible
    });
  },
  _renderHeader: function () {
    var data = this.state.data;
    return (
      <View style={styles.listHeader}>
        <View style={styles.infoBox}>
          <Image
            style={styles.avatar}
            source={{uri: util.avatar(data.author.avatar)}} />
          <View style={styles.descBox}>
            <Text style={styles.nickname}>{data.author.nickname}</Text>
            <Text style={styles.title}>{data.title}</Text>
          </View>
        </View>
        <View style={styles.commentBox}>
          <View style={styles.comment}>
            <TextInput
              placeholder='敢不敢评论一个!'
              style={styles.content}
              multiline={true}
              onFocus={this._focus}
            />
          </View>
        </View>
        <View style={styles.commentArea}>
          <Text>精彩评论</Text>
        </View>
      </View>
    );
  },
  _submit: function () {
    var that = this;
    if(!this.state.content){
      return AlertIOS.alert('留言不能为空！')
    }
    if(this.state.isSending){
      return AlertIOS.alert('评论提交中！')
    }
    this.setState({
      isSending: true
    }, function(){
      var body = {
        accessToken: this.state.user.accessToken,
        comment: {
          creation: this.state.data._id,
          content: this.state.content
        }
      };
      var url = config.api.base + config.api.comment;

      request.post(url, body)
        .then(function(data){
          if(data && data.success){
            var items = cachedResults.items.slice();

            items = data.data.concat(items);
            cachedResults.items = items;
            cachedResults.total = cachedResults.total + 1;
            that.setState({
              content: '',
              isSending: false,
              dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
            });
            that._setModalVisible(false);
          }
        })
        .catch((err) => {
          console.log(err);
          that.setState({
            isSending: false
          });
          that._setModalVisible(false);
          AlertIOS.alert('留言失败，稍后重试！');
        });
    })
  },
  render: function () {
    var data = this.props.data;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBox} onPress={this._pop} >
            <Icon name="ios-arrow-back" style={styles.backIcon} />
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>视频详情页</Text>
        </View>
        <View style={styles.videoBox}>
          <Video
            ref="videoPlayer"
            source={{uri: util.video(data.qiniu_video)}}
            style={styles.video}
            volume={5}
            paused={this.state.paused}
            rate={this.state.rate}
            muted={this.state.muted}
            resizeMode={this.state.resizeMode}
            repeat={this.state.repeat}
            onLoadStart={this._onLoadStart}
            onLoad={this._onLoad}
            onProgress={this._onProgress}
            onEnd={this._onEnd}
            onError={this._onError}
          />
          {
            !this.state.videoOk && <Text style={styles.failText} >很抱歉！视频出错了！</Text>
          }
          {
            !this.state.videoLoaded && <ActivityIndicator color='#ee735c' style={styles.loading} />
          }
          {
            this.state.videoLoaded && !this.state.playing
            ? <Icon
                onPress={this._rePlay}
                name="ios-play"
                size={48}
                style={styles.playIcon} />
            : null
          }
          {
            this.state.videoLoaded && this.state.playing
              ? <TouchableOpacity onPress={this._pause} style={styles.pauseBtn} >
                  {
                    this.state.paused
                    ? <Icon onPress={this._resume} size={48} name="ios-play" style={styles.resumeIcon} />
                    : <Text></Text>
                  }
                </TouchableOpacity>
              : null
          }
          <View style={styles.progressBox}>
            <View style={[styles.progressBar, {width: width*this.state.videoProgress}]}></View>
          </View>
        </View>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
          enableEmptySections={true}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
          renderHeader={this._renderHeader}
          renderFooter={this._renderFooter}
          onEndReached={this._fetchMoreData}
          onEndReachedThreshold={20}
        />
        <Modal
          animationType={'fade'}
          visible={this.state.modalVisible} >
          <View style={styles.modalContainer}>
            <Icon
              onPress={this._closeModal}
              name='ios-close-outline'
              style={styles.closeIcon} />
            <View style={styles.commentBox}>
              <View style={styles.comment}>
                <TextInput
                  placeholder='敢不敢评论一个'
                  style={styles.content}
                  multiline={true}
                  defaultValue={this.state.content}
                  onChangeText={(text) => {
                    this.setState({
                      content: text
                    })
                  }}
                />
              </View>
            </View>
            <Button title='pinglun' style={styles.submitBtn} onPress={this._submit}>评论
            </Button>
          </View>
        </Modal>
      </View>
    );
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF'
  },
  modalContainer: {
    flex: 1,
    paddingTop: 45,
    backgroundColor: '#fff'
  },
  closeIcon: {
    alignSelf: 'center',
    fontSize: 30,
    color: '#ee753c'
  },
  submitBtn: {
    width: width - 20,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ee753c',
    borderRadius: 4,
    fontSize: 18,
    color: '#ee753c',
    alignSelf: 'center'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: 64,
    paddingTop: 20,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
  },
  backBox: {
    position: 'absolute',
    left: 12,
    top: 32,
    width: 50,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    width: width - 120,
    textAlign: 'center'
  },
  backIcon: {
    color: '#999',
    fontSize: 20,
    marginRight: 5
  },
  backText: {
    color: '#999'
  },
  videoBox: {
    width: width,
    height: width*0.56,
    backgroundColor: '#000'
  },
  video: {
    width: width,
    height: width*0.56,
    backgroundColor: '#000'
  },
  failText: {
    position: 'absolute',
    left: 0,
    top: 90,
    width: width,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: 'transparent'
  },
  loading: {
    position: 'absolute',
    left: 0,
    top: 80,
    width: width,
    alignSelf: 'center',
    backgroundColor: 'transparent'
  },
  progressBox: {
    width: width,
    height: 2,
    backgroundColor: '#ccc'
  },
  progressBar: {
    width: 1,
    height: 2,
    backgroundColor: '#ff6600'
  },
  playIcon: {
    position: 'absolute',
    top: 90,
    left: width/2-30,
    width: 60,
    height: 60,
    paddingTop: 8,
    paddingLeft: 22,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },
  pauseBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: width,
    height: width*0.56
  },
  resumeIcon: {
    position: 'absolute',
    top: 80,
    left: width/2-30,
    width: 60,
    height: 60,
    paddingTop: 8,
    paddingLeft: 22,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 30,
    color: '#ed7b66'
  },
  infoBox: {
    width: width,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10
  },
  avatar: {
    width: 60,
    height: 60,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 30
  },
  descBox: {
    flex: 1
  },
  nickname: {
    fontSize: 18
  },
  title: {
    marginTop: 8,
    fontSize: 16,
    color: '#666'
  },
  replyBox: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 10
  },
  replyAvatar: {
    width: 40,
    height: 40,
    marginRight: 10,
    marginLeft: 10,
    borderRadius: 20
  },
  replyNickname: {
    color: '#666'
  },
  replyContent: {
    marginTop: 4,
    color: '#666'
  },
  reply: {
    flex: 1
  },
  loadingMore: {
    marginVertical: 20
  },
  loadingText: {
    color: '#777',
    textAlign: 'center'
  },
  listHeader: {
    width: width,
    marginTop: 10
  },
  commentBox: {
    marginTop: 10,
    marginBottom: 10,
    padding: 8,
    width: width
  },
  content: {
    paddingLeft: 2,
    color: '#333',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    fontSize: 14,
    height: 80
  },
  commentArea: {
    width: width,
    paddingBottom: 6,
    paddingLeft: 10,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  }
});

module.exports = Detail;