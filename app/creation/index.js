var React = require('react');
import Icon from 'react-native-vector-icons/Ionicons';
var request = require('../common/request');
var config = require('../common/config');
var util = require('../common/util');
var Detail = require('./detail');
var ReactNative = require('react-native');
var {
  StyleSheet,
  Text,
  View,
  TouchableHighlight,
  ListView,
  // Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  AlertIOS,
  AsyncStorage
} = ReactNative;
import Image from 'react-native-image-progress';
import ProgressBar from 'react-native-progress/Bar';

var width = Dimensions.get('window').width;
var cachedResults = {
  nextPage: 1,
  items: [],
  total: 0
};

var Item = React.createClass({
  getInitialState: function () {
    var row = this.props.row;
    return {
      up: row.voted,
      row: row
    };
  },
  _up: function () {
    var that = this;
    var up = !this.state.up;
    var row = this.state.row;
    var url = config.api.base + config.api.up;
    var body = {
      id: row._id,
      up: up?'yes':'no',
      accessToken: this.props.user.accessToken
    };

    request.post(url, body)
      .then(data => {
        if (data && data.success) {
          that.setState({
            up: up
          });
        } else {
          AlertIOS.alert('点赞失败，稍后重试!');
        }
      }).catch(err => {
        console.log(err);
        AlertIOS.alert('点赞失败，稍后重试!');
      });
  },
  render: function () {
    var row = this.state.row;
    return (
      <TouchableHighlight onPress={this.props.onSelect}>
        <View style={styles.item}>
          <Text style={styles.title}>{row.title}</Text>
          <Image
            source={{uri: util.thumb(row.qiniu_thumb)}}
            indicator={ProgressBar}
            style={styles.thumb}>
            <Icon
              name="ios-play"
              size={28}
              style={styles.play} />
          </Image>
          <View style={styles.itemFooter}>
            <View style={styles.handleBox}>
              <Icon
                name={this.state.up? "ios-heart" : "ios-heart-outline"}
                size={28}
                onPress={this._up}
                style={[styles.up, this.state.up?null:styles.down]} />
              <Text style={styles.handleText} onPress={this._up}>喜欢</Text>
            </View>
            <View style={styles.handleBox}>
              <Icon
                name="ios-chatboxes-outline"
                size={28}
                style={styles.commentIcon} />
              <Text style={styles.handleText}>评论</Text>
            </View>
          </View>
        </View>
      </TouchableHighlight>
    );
  }
});
var List = React.createClass({
  getInitialState: function() {
    var ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});
    return {
      user: null,
      isLoadingTail: false,
      isRefreshing: false,
      dataSource: ds.cloneWithRows([])
    };
  },
  _renderRow: function(row) {
    return <Item
      row={row}
      user={this.state.user}
      onSelect={() => this._loadPage(row)}
      key={row._id} />;
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
            that._fetchData(1);
          });
        }
      });
  },
  _fetchData: function (page) {
    var that = this;
    if (page !== 0) {
      this.setState({
        isLoadingTail: true
      });
    } else {
      this.setState({
        isRefreshing: true
      });
    }

    var user = this.state.user;
    request.get(config.api.base + config.api.creations, {
      accessToken: user.accessToken,
      page: page
    })
      .then((data) => {
        if (data && data.success) {
          if (data.data.length > 0) {
            data.data.map(item => {
              var votes = item.votes || [];
              if (votes.indexOf(user._id) > -1) {
                item.voted = true;
              } else {
                item.voted = false;
              }
              return item;
            });

            var items = cachedResults.items.slice();
            if (page !== 0) {
              items = items.concat(data.data);
              cachedResults.nextPage += 1;
            } else {
              items = data.data;
              cachedResults.nextPage = 2;
            }
            cachedResults.items = items;
            cachedResults.total = data.total;

            if (page !== 0) {
              that.setState({
                isLoadingTail: false,
                dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
              });
            } else {
              that.setState({
                isRefreshing: false,
                dataSource: that.state.dataSource.cloneWithRows(cachedResults.items)
              });
            }
          }
        }
      })
      .catch((error) => {
        if (page !== 0) {
          this.setState({
            isLoadingTail: false
          });
        } else {
          this.setState({
            isRefreshing: false
          });
        }
        console.warn(error);
      });
  },
  _hasMore: function () {
    return cachedResults.items.length !== cachedResults.total;
  },
  _fetchMoreData: function () {
    if (!this._hasMore() || this.state.isLoadingTail) {
      return;
    }
    var page = cachedResults.nextPage;
    this._fetchData(page);
  },
  _onRefresh: function () {
    if (this.state.isRefreshing) {
      return;
    }
    this.setState({
      isRefreshing: true
    });
    this._fetchData(0);
  },
  _renderFooter: function () {
    if (!this._hasMore() && cachedResults.total !== 0) {
      return (
        <View style={styles.loadingMore}>
          <Text style={styles.loadingText}>没有更多了！</Text>
        </View>
      );
    }
    if (!this.state.isLoadingTail) {
      return <View style={styles.loadingMore} />;
    }
    return <ActivityIndicator style={styles.loadingMore} />;
  },
  _loadPage: function (row) {
    this.props.navigator.push({
      name: 'detail',
      component: Detail,
      params: {
        data: row
      }
    });
  },
  render: function () {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>列表页面</Text>
        </View>
        <ListView
          dataSource={this.state.dataSource}
          renderRow={this._renderRow}
          renderFooter={this._renderFooter}
          enableEmptySections={true}
          onEndReached={this._fetchMoreData}
          onEndReachedThreshold={20}
          showsVerticalScrollIndicator={false}
          automaticallyAdjustContentInsets={false}
          refreshControl={
            <RefreshControl
              refreshing={this.state.isRefreshing}
              onRefresh={this._onRefresh}
              tintColor="#ff6600"
              title='拼命加载中...'
            />
          }
        />
      </View>
    );
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },
  header: {
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600'
  },
  item: {
    width: width,
    marginBottom: 10,
    backgroundColor: '#fff'
  },
  thumb: {
    width: width,
    height: width * 0.56,
    resizeMode: 'cover'
  },
  title: {
    padding: 10,
    fontSize: 18,
    color: '#333'
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#eee'
  },
  handleBox: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    width: width/2 - 0.5,
    backgroundColor: '#fff'
  },
  play: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 46,
    height: 46,
    paddingTop: 9,
    paddingLeft: 18,
    backgroundColor: 'transparent',
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 23,
    color: '#ed7b66'
  },
  handleText: {
    paddingLeft: 12,
    fontSize: 18,
    color: '#333'
  },
  down: {
    fontSize: 22,
    color: '#333'
  },
  up: {
    fontSize: 22,
    color: '#ed7b66'
  },
  commentIcon: {
    fontSize: 22,
    color: '#333'
  },
  loadingMore: {
    marginVertical: 20
  },
  loadingText: {
    color: '#777',
    textAlign: 'center'
  }
});

module.exports = List;