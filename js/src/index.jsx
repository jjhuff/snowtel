import React from "react";
import ReactDOM from "react-dom";

import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import CssBaseline from "@material-ui/core/CssBaseline";
import Typography from "@material-ui/core/Typography";
import Container from "@material-ui/core/Container";

import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import SensorListPage from "./components/SensorListPage.jsx";
import SensorDetailPage from "./components/SensorDetailPage.jsx";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  title: {
    flexGrow: 1,
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    height: "100vh",
    overflow: "auto",
  },
  container: {
    paddingTop: theme.spacing(4),
    paddingBottom: theme.spacing(4),
  },
  paper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
  },
}));

const App = () => {
  const classes = useStyles();
   
  return (
    <Router>
      <div className={classes.root}>
          <CssBaseline />
          <AppBar position="absolute" className={classes.appBar}>
              <Toolbar className={classes.toolbar}>
                  <Typography component="h1" variant="h6" color="inherit" noWrap className={classes.title}>
                      Snow Report
                  </Typography>
              </Toolbar>
          </AppBar>
          <main className={classes.content}>
              <div className={classes.appBarSpacer} />
              <Container maxWidth="lg" className={classes.container}>
                  <Switch>
                      <Route path="/sensor/:id">
                          <SensorDetailPage/>
                      </Route>
                      <Route path="/">
                          <SensorListPage/>
                      </Route>
                  </Switch>
              </Container>
          </main>
      </div>
  </Router>
  );
};

ReactDOM.render(<App />, document.querySelector("#root"));
