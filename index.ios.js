var React = require('react');
var Icon = require('react-native-vector-icons/Ionicons');
var ReactNative = require('react-native');

var List = require('./app/creation/index');
var Edit = require('./app/edit/index');
var Account = require('./app/account/index');
var Login = require('./app/account/login');
var Slider = require('./app/account/slider');

var {
  AppRegistry,
  StyleSheet,
  TabBarIOS,
  Navigator,
  AsyncStorage,
  View,
  ActivityIndicator,
  Dimensions
} = ReactNative;
var {height, width} = Dimensions.get('window');

var reactNative = React.createClass({
  getInitialState: function () {
    return {
      user: null,
      booted: false,
      selectedTab: 'list',
      entered: false,
      logined: false
    };
  },
  componentDidMount: function () {
    this._asyncAppStatus();
  },
  _logout: function () {
    AsyncStorage.removeItem('user');
    this.setState({
      logined: false,
      user: null
    });
  },
  _asyncAppStatus: function () {
    var that = this;
    AsyncStorage.multiGet(['user', 'entered'])
      .then((data) => {
        var userData = data[0][1];
        var entered = data[1][1];
        var user;
        var newState = {
          booted: true
        };
        if(userData){
          user = JSON.parse(userData);
        }
        if(user && user.accessToken){
          newState.user = user;
          newState.logined = true;
        }else{
          newState.logined = false;
        }
        if(entered === 'yes'){
          newState.entered = true;
        }
        that.setState(newState);
      })
  },
  _afterLogin: function (user) {
    var that = this;
    var user = JSON.stringify(user);
    AsyncStorage.setItem('user', user)
      .then(() => {
        that.setState({
          logined: true,
          user: user
        });
      })
  },
  _enterSlide(){
    this.setState({
      entered: true
    }, function(){
      AsyncStorage.setItem('entered', 'yes');
    })
  },
  render: function() {
    if(!this.state.booted){
      return (
        <View style={styles.bootPage}>
          <ActivityIndicator color="#ee735c" />
        </View>
      )
    }
    if(!this.state.entered){
      return <Slider enterSlide={this._enterSlide} />
    }
    if (!this.state.logined) {
      return <Login afterLogin={this._afterLogin} />;
    }
    return (
      <TabBarIOS
        tintColor="#ee735c">
        <Icon.TabBarItem
          iconName='ios-videocam-outline'
          selectedIconName='ios-videocam'
          selected={this.state.selectedTab === 'list'}
          onPress={() => {
            this.setState({
              selectedTab: 'list'
            });
          }}>
          <Navigator
            initialRoute={{
              name: 'list',
              component: List
            }}
            configureScene={(route) => {
              return Navigator.SceneConfigs.FloatFromRight;
            }}
            renderScene={(route, navigator) => {
              var Component = route.component;
              return <Component {...route.params} navigator={navigator} />
            }}
          />
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName='ios-recording-outline'
          selectedIconName='ios-recording'
          selected={this.state.selectedTab === 'edit'}
          onPress={() => {
            this.setState({
              selectedTab: 'edit'
            });
          }}>
          <Edit/>
        </Icon.TabBarItem>
        <Icon.TabBarItem
          iconName='ios-more-outline'
          selectedIconName='ios-more'
          selected={this.state.selectedTab === 'account'}
          onPress={() => {
            this.setState({
              selectedTab: 'account'
            });
          }}>
          <Account user={this.state.user} logout={this._logout} />
        </Icon.TabBarItem>
      </TabBarIOS>
    );
  },

});
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  bootPage: {
    width: width,
    height: height,
    backgroundColor: '#fff',
    justifyContent: 'center'
  }
});

AppRegistry.registerComponent('reactNative', () => reactNative);