var React = require('react');
import Icon from 'react-native-vector-icons/Ionicons';
import * as Progress from 'react-native-progress';
import Button from 'react-native-button';
var ReactNative = require('react-native');
var {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Image,
  AsyncStorage,
  AlertIOS,
  Modal,
  TextInput
} = ReactNative;
var ImagePicker = require('react-native-image-picker');
var sha1 = require('sha1');
var width = Dimensions.get('window').width;
var request = require('../common/request');
var config = require('../common/config');
var photoOptions = {
  title: '选择头像',
  cancelButtonTitle: '取消',
  takePhotoButtonTitle: '拍照',
  chooseFromLibraryButtonTitle: '选择相册',
  quality: 0.75,
  allowsEditing: true,
  noData: false,
  storageOptions: {
    skipBackup: true,
    path: 'images'
  }
};

function avatar(id, type) {
  if (id.indexOf('http') > -1) return id;
  if (id.indexOf('data:image') > -1) return id;
  if (id.indexOf('avatar/') > -1) return config.cloudinary.base + '/' + type + '/upload/' + id;
  return 'http://opfly0yns.bkt.clouddn.com/' + id;
}

var Account = React.createClass({
  getInitialState: function () {
    var user = this.props.user || {};
    return {
      user: user,
      avatarProgress: 0,
      avatarUploading: false,
      modalVisible: false
    };
  },
  _edit: function () {
    this.setState({
      modalVisible: true
    });
  },
  _closeModal: function () {
    this.setState({
      modalVisible: false
    });
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
          })
        }
      })
  },
  _getQiniuToken: function () {
    var accessToken = this.state.user.accessToken;
    var signatureURL = config.api.base + config.api.signature;
    return request.post(signatureURL, {
      accessToken: accessToken,
      type: 'avatar',
      cloud: 'qiniu'
    }).catch(err => console.log(err));
  },
  _pickPhoto: function () {
    var that = this;
    ImagePicker.showImagePicker(photoOptions, (res) => {
      if (res.didCancel) {
        return;
      }
      // var avatarData = 'data:image/jpeg;base64,' + res.data;
      var uri = res.uri;
      that._getQiniuToken()
        .then(data => {
          if (data && data.success) {
            var token = data.data.token;
            var key = data.data.key;
            var body = new FormData();
            body.append('token', token);
            body.append('key', key);
            body.append('file', {
              type: 'image/png',
              uri: uri,
              name: key
            });

            console.log(body);
            that._upload(body);
          }
        }).catch(err => console.log(err));
    });
  },
  _upload: function (body) {
    var that = this;
    var xhr = new XMLHttpRequest();
    var url = config.qiniu.upload;
    // var url = config.cloudinary.image;

    this.setState({
      avatarUploading: true,
      avatarProgress: 0
    });
    xhr.open('POST', url);
    xhr.onload = () => {
      if (xhr.status !== 200) {
        AlertIOS.alert('上传图片失败！');
        console.log(xhr.responseText);
        return;
      }
      if (!xhr.responseText) {
        AlertIOS.alert('上传图片失败');
        return;
      }
      var response;
      try {
        response = JSON.parse(xhr.response)
      } catch (e) {
        console.log(e);
        console.log('parse fails!');
      }
      console.log(response);
      if (response) {
        var user = this.state.user;
        if (response.public_id) {
          user.avatar = response.public_id;
        }
        if (response.key) {
          user.avatar = response.key;
        }
        that.setState({
          user: user,
          avatarUploading: false,
          avatarProgress: 0
        }, () => that._asyncUser(true));
      }
    };
    if (xhr.upload) {
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          var percent = Number((event.loaded / event.total).toFixed(2));
          that.setState({
            avatarProgress: percent
          });
        }
      };
    }
    xhr.send(body);
  },
  _asyncUser: function (isAvatar) {
    var that = this;
    var user = this.state.user;
    if(user && user.accessToken){
      var url = config.api.base + config.api.update;
      request.post(url, user)
        .then((data) => {
          if(data && data.success){
            var user = data.data;
            if (isAvatar) AlertIOS.alert('头像更新成功!');
            that.setState({
              user: user
            }, () => {
              that._closeModal();
              AsyncStorage.setItem('user', JSON.stringify(user))
            });
          }
        });
    }
  },
  _changeUserState: function (key, value) {
    var user = this.state.user;
    user[key] = value;
    this.setState({
      user: user
    });
  },
  _submit: function () {
    this._asyncUser();
  },
  _logout: function () {
    this.props.logout();
  },
  render: function () {
    var user = this.state.user;
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.toolbarTitle}>我的账户</Text>
          <Text style={styles.toolbarExtra} onPress={this._edit}>编辑</Text>
        </View>

        {
          user.avatar
          ? <TouchableOpacity onPress={this._pickPhoto} style={styles.avatarContainer}>
              <Image source={{uri: avatar(user.avatar, 'image')}} style={styles.avatarContainer}>
                <View style={styles.avatarBox}>
                  {
                    this.state.avatarUploading
                      ? <Progress.Circle
                          showsText={true}
                          size={75}
                          progress={this.state.avatarProgress}
                          // indeterminate={true}
                          color={'#ee735c'}
                        />
                      : <Image
                          source={{uri: avatar(user.avatar, 'image')}}
                          style={styles.avatar} />
                  }
                </View>
                <Text style={styles.avatarTip}>戳这里换头像</Text>
              </Image>
            </TouchableOpacity>
          : <TouchableOpacity onPress={this._pickPhoto} style={styles.avatarContainer}>
              <Text style={styles.avatarTip}>添加头像</Text>
              <View style={styles.avatarBox}>
                {
                  this.state.avatarUploading
                  ? <Progress.Circle
                      showsText={true}
                      size={75}
                      progress={this.state.avatarProgress}
                      // indeterminate={true}
                      color={'#ee735c'}
                    />
                  : <Icon
                      name="ios-cloud-upload-outline"
                      style={styles.plusIcon}
                    />
                }
              </View>
            </TouchableOpacity>
        }

        <Modal
          animationType={'slide'}
          visible={this.state.modalVisible} >
          <View style={styles.modalContainer}>
            <Icon
              name='ios-close-outline'
              onPress={this._closeModal}
              style={styles.closeIcon} />
            <View style={styles.fieldItem}>
              <Text style={styles.label}>昵称</Text>
              <TextInput
                placeholder={'输入你的昵称'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.nickname}
                onChangeText={(text) => {
                  this._changeUserState('nickname', text)
                }}
              />
            </View>
            <View style={styles.fieldItem}>
              <Text style={styles.label}>品种</Text>
              <TextInput
                placeholder={'宠物的品种'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.breed}
                onChangeText={(text) => {
                  this._changeUserState('breed', text)
                }}
              />
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.label}>年龄</Text>
              <TextInput
                placeholder={'宠物的年龄'}
                style={styles.inputField}
                autoCapitalize={'none'}
                autoCorrect={false}
                defaultValue={user.age}
                onChangeText={(text) => {
                  this._changeUserState('age', text)
                }}
              />
            </View>

            <View style={styles.fieldItem}>
              <Text style={styles.label}>性别</Text>
              <Icon.Button
                onPress={() => {
                  this._changeUserState('gender', 'male')
                }}
                style={[
                  styles.gender,
                  user.gender === 'male' && styles.genderChecked
                ]}
                name='ios-paw'>男</Icon.Button>
              <Icon.Button
                onPress={() => {
                  this._changeUserState('gender', 'female')
                }}
                style={[
                  styles.gender,
                  user.gender === 'female' && styles.genderChecked
                ]}
                name='ios-paw-outline'>女</Icon.Button>
            </View>
            <Button
              style={styles.btn}
              onPress={this._submit}>保存资料</Button>
          </View>
        </Modal>
        <Button
          style={styles.btn}
          onPress={this._logout}>退出登录</Button>
      </View>
    );
  }
});

var styles = StyleSheet.create({
  container: {
    flex: 1
  },
  toolbar: {
    flexDirection: 'row',
    paddingTop: 25,
    paddingBottom: 12,
    backgroundColor: '#ee735c'
  },
  toolbarTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600'
  },
  toolbarExtra: {
    position: 'absolute',
    right: 10,
    top: 26,
    color: '#fff',
    textAlign: 'right',
    fontWeight: '600',
    fontSize: 14
  },
  avatarContainer: {
    width: width,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#777'
  },
  avatarTip: {
    color: '#fff',
    backgroundColor: 'transparent',
    fontSize: 14
  },
  avatarBox: {
    marginTop: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatar: {
    marginBottom: 15,
    width: width * 0.2,
    height: width * 0.2,
    resizeMode: 'cover',
    borderRadius: width * 0.1
  },
  plusIcon: {
    padding: 20,
    paddingLeft: 25,
    paddingRight: 25,
    color: '#999',
    fontSize: 24,
    backgroundColor: '#fff',
    borderRadius: 8
  },
  modalContainer: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'
  },
  fieldItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 50,
    paddingLeft: 15,
    paddingRight: 15,
    borderColor: '#eee',
    borderBottomWidth: 1
  },
  label: {
    color: '#ccc',
    marginRight: 10
  },
  closeIcon: {
    position: 'absolute',
    width: 40,
    height: 40,
    fontSize: 32,
    right: 20,
    top: 30,
    color: '#ee735c'
  },
  gender: {
    backgroundColor: '#ccc'
  },
  genderChecked: {
    backgroundColor: '#ee735c'
  },
  inputField: {
    flex: 1,
    height: 50,
    color: '#666',
    fontSize: 14
  },
  btn: {
    margin: 25,
    padding: 10,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: 'transparent',
    borderColor: '#ee735c',
    borderWidth: 1,
    borderRadius: 4,
    color: '#ee735c'
  }
});

module.exports = Account;